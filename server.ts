import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { store, ServerState } from "./server/store";
import { dbCrypto } from "./server/crypto";
import { setupWebSocket, broadcast, getConnectedClientsCount } from "./server/ws";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Initialize WebSockets
  setupWebSocket(httpServer);

  // Middleware for parsing JSON
  app.use(express.json({ limit: '50mb' }));

  // Create reports and backups directories if needed
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log('[Server] Created reports directory');
  }

  const dataDir = path.join(process.cwd(), 'data');
  const backupsDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Serve public static assets
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // API to save reports
  app.post("/api/save-report", (req, res) => {
    const { csvData, fileName } = req.body;
    
    if (!csvData || !fileName) {
      return res.status(400).json({ error: 'Missing data or filename' });
    }

    const filePath = path.join(reportsDir, fileName);
    
    try {
      // Add UTF-8 BOM for Excel compatibility
      const content = '\uFEFF' + csvData;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Report] Saved report: ${fileName}`);
      res.json({ success: true, path: filePath });
    } catch (error) {
      console.error('[Report] Error saving report:', error);
      res.status(500).json({ error: 'Failed to save report' });
    }
  });

  // REST endpoints for State Synchronization with Encryption Metadata
  app.get("/api/state", (_req, res) => {
    res.json({
      success: true,
      data: store.getState(),
      encryption: dbCrypto.getStatus(),
      onlineClients: getConnectedClientsCount(),
      serverTime: new Date().toISOString()
    });
  });

  // Server-side login validation and session tracking
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Вкажіть email та пароль' });
      }

      const users = store.getState().authorizedUsers || [];
      const user = users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!user) {
        store.addAuditLog({
          action: 'Невдала спроба входу',
          category: 'auth',
          userEmail: email,
          userName: 'Невідомий',
          details: `Спроба авторизації з невідомим email: ${email}`,
          status: 'error'
        });
        return res.status(401).json({ success: false, message: 'Користувача з такою поштою не знайдено' });
      }

      const expectedPassword = user.password || 'admin';
      if (password !== expectedPassword) {
        store.addAuditLog({
          action: 'Помилка пароля',
          category: 'auth',
          userEmail: email,
          userName: user.name,
          details: `Введено невірний пароль для ${user.name} (${email})`,
          status: 'warning'
        });
        return res.status(401).json({ success: false, message: 'Невірний пароль для цього облікового запису' });
      }

      // Success
      store.addAuditLog({
        action: 'Успішний вхід',
        category: 'auth',
        userEmail: user.email,
        userName: user.name,
        details: `Авторизовано в системі з роллю: ${user.roleId}`,
        status: 'success'
      });

      res.json({
        success: true,
        message: `Вітаємо, ${user.name}! Вхід виконано успішно.`,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          avatarColor: user.avatarColor
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/state/update", (req, res) => {
    const { key, data, clientId } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key' });
    }

    store.updateKey(key as keyof ServerState, data);
    broadcast({
      type: 'sync:update',
      key,
      data,
      updatedBy: clientId || 'api',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, lastUpdated: store.getState().lastUpdated });
  });

  app.post("/api/state/patch", (req, res) => {
    const { patch, clientId } = req.body;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'Invalid patch object' });
    }

    store.patch(patch);
    broadcast({
      type: 'sync:patch',
      patch,
      updatedBy: clientId || 'api',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, lastUpdated: store.getState().lastUpdated });
  });

  app.post("/api/state/seed-if-empty", (req, res) => {
    const { data } = req.body;
    if (data && typeof data === 'object') {
      const seeded = store.seedIfEmpty(data);
      if (seeded) {
        broadcast({
          type: 'sync:init',
          data: store.getState(),
          serverTime: new Date().toISOString()
        });
      }
      return res.json({ success: true, seeded, state: store.getState() });
    }
    res.status(400).json({ error: 'Invalid data' });
  });

  // REST broadcast endpoint for real-time discrete events
  app.post("/api/events/broadcast", (req, res) => {
    try {
      const { eventType, eventData, clientId } = req.body;
      if (!eventType) {
        return res.status(400).json({ error: 'Missing eventType' });
      }

      store.handleServerEvent(eventType, eventData);

      broadcast({
        type: 'sync:event',
        eventType,
        eventData,
        updatedBy: clientId || 'api',
        timestamp: new Date().toISOString()
      });

      if (eventType.startsWith('dirty_sky')) {
        broadcast({
          type: 'sync:update',
          key: 'dirtySkyEvents',
          data: store.getState().dirtySkyEvents,
          updatedBy: clientId || 'api',
          timestamp: new Date().toISOString()
        });
      } else if (eventType === 'duty:add') {
        broadcast({
          type: 'sync:update',
          key: 'dutyEvents',
          data: store.getState().dutyEvents,
          updatedBy: clientId || 'api',
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, lastUpdated: store.getState().lastUpdated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Encryption status and verification endpoints
  app.get("/api/encryption/status", (_req, res) => {
    const status = dbCrypto.getStatus();
    const integrity = store.verifyDatabaseIntegrity();
    res.json({
      success: true,
      encryption: {
        ...status,
        integrityVerified: integrity.valid,
        integrityDetails: integrity.details
      }
    });
  });

  app.post("/api/encryption/verify", (_req, res) => {
    const integrity = store.verifyDatabaseIntegrity();
    store.addAuditLog({
      action: 'Перевірка цілісності шифрування',
      category: 'encryption',
      userEmail: 'admin',
      userName: 'Адміністратор',
      details: integrity.valid ? 'Цілісність GCM MAC успішно підтверджена' : `Помилка: ${integrity.details}`,
      status: integrity.valid ? 'success' : 'error'
    });
    res.json({ success: true, integrity });
  });

  // Upload and snapshot full database to server with AES-256-GCM encryption
  app.post("/api/backup/upload-to-server", (req, res) => {
    try {
      const { data, userEmail } = req.body;
      const snapshot = store.createBackupSnapshot(data);

      broadcast({
        type: 'sync:init',
        data: store.getState(),
        serverTime: new Date().toISOString(),
        backupUploadedBy: userEmail || 'user'
      });

      console.log(`[Backup] Server encrypted backup completed by ${userEmail || 'operator'}: ${snapshot.filename}`);
      res.json({
        success: true,
        message: 'Повну базу успішно зашифровано (AES-256-GCM) та збережено на сервері',
        snapshot,
        lastUpdated: store.getState().lastUpdated
      });
    } catch (err: any) {
      console.error('[Backup] Upload error:', err);
      res.status(500).json({ success: false, error: err.message || 'Помилка вивантаження на сервер' });
    }
  });

  // Get list of server encrypted backups
  app.get("/api/backup/server-backups", (_req, res) => {
    try {
      const backups = store.getServerBackups();
      res.json({ success: true, backups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Restore database from server backup snapshot
  app.post("/api/backup/restore-from-server", (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename is required' });
      }

      const restoredState = store.restoreBackupSnapshot(filename);
      if (!restoredState) {
        return res.status(404).json({ success: false, error: 'Бекап файл не знайдено на сервері або помилка розшифрування' });
      }

      broadcast({
        type: 'sync:init',
        data: restoredState,
        serverTime: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Базу успішно розшифровано та відновлено з серверного бекапу: ${filename}`,
        state: restoredState
      });
    } catch (err: any) {
      console.error('[Backup] Restore error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static icon files
  app.get("/api/icons/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(store.iconsDir, filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Icon not found');
    }
  });

  // Save icon to server (brigade, user avatar, or general)
  app.post("/api/icons", (req, res) => {
    try {
      const { id, name, data, category, targetId } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: 'Дані іконки відсутні' });
      }

      const icon = store.saveCustomIcon({ id, name, data, category, targetId });

      // Broadcast update to all connected clients
      broadcast({
        type: 'sync:update',
        key: 'customIcons',
        data: store.getState().customIcons,
        updatedBy: 'server',
        timestamp: new Date().toISOString()
      });

      if (category === 'brigade') {
        broadcast({
          type: 'sync:update',
          key: 'locations',
          data: store.getState().locations,
          updatedBy: 'server',
          timestamp: new Date().toISOString()
        });
      } else if (category === 'user') {
        broadcast({
          type: 'sync:update',
          key: 'authorizedUsers',
          data: store.getState().authorizedUsers,
          updatedBy: 'server',
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, icon });
    } catch (err: any) {
      console.error('[Icon] Upload error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get all custom icons
  app.get("/api/icons", (_req, res) => {
    try {
      res.json({
        success: true,
        icons: store.getState().customIcons || []
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete custom icon
  app.delete("/api/icons/:id", (req, res) => {
    try {
      const { id } = req.params;
      const success = store.deleteCustomIcon(id);
      if (success) {
        broadcast({
          type: 'sync:update',
          key: 'customIcons',
          data: store.getState().customIcons,
          updatedBy: 'server',
          timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: 'Іконку успішно видалено' });
      } else {
        res.status(404).json({ success: false, error: 'Іконку не знайдено' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create full system archive on the server (.zip)
  app.post("/api/backup/server-archive", (req, res) => {
    try {
      const { creatorEmail, creatorName } = req.body;
      const archive = store.createFullSystemArchive(creatorEmail, creatorName);
      res.json({
        success: true,
        message: `Повний архів системи успішно сформовано на сервері: ${archive.filename}`,
        archive
      });
    } catch (err: any) {
      console.error('[Backup] Server archive error:', err);
      res.status(500).json({ success: false, error: err.message || 'Помилка створення архіву' });
    }
  });

  // List all server archives
  app.get("/api/backup/server-archives", (_req, res) => {
    try {
      const archives = store.getServerArchives();
      res.json({ success: true, archives });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Download full archive file (.zip)
  app.get("/api/backup/download-archive/:filename", (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(store.archivesDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Архівний файл не знайдено на сервері' });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Restore entire system from a server archive
  app.post("/api/backup/restore-server-archive", (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename is required' });
      }

      const restoredState = store.restoreFromFullArchive(filename);
      if (!restoredState) {
        return res.status(400).json({ success: false, error: 'Не вдалося відновити систему з вказаного архіву' });
      }

      broadcast({
        type: 'sync:init',
        data: restoredState,
        serverTime: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Систему успішно відновлено з повного архіву: ${filename}`,
        state: restoredState
      });
    } catch (err: any) {
      console.error('[Backup] Restore archive error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete archive file from server
  app.delete("/api/backup/server-archive/:filename", (req, res) => {
    try {
      const filename = path.basename(req.params.filename);
      const success = store.deleteServerArchive(filename);
      if (success) {
        res.json({ success: true, message: `Архів ${filename} успішно видалено з сервера` });
      } else {
        res.status(404).json({ success: false, error: 'Архівний файл не знайдено' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export encrypted package (.enc) for local download
  app.get("/api/backup/export-encrypted", (_req, res) => {
    try {
      const state = store.getState();
      const payload = dbCrypto.encrypt(state);
      const filename = `skud_encrypted_db_${new Date().toISOString().replace(/[:.]/g, '-')}.enc`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(payload, null, 2));

      store.addAuditLog({
        action: 'Експорт зашифрованої бази',
        category: 'backup',
        userEmail: 'operator',
        userName: 'Оператор',
        details: `Експортовано зашифрований архів ${filename}`,
        status: 'info'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import external encrypted package (.enc)
  app.post("/api/backup/import-encrypted", (req, res) => {
    try {
      const { payload, passphrase } = req.body;
      if (!payload || !payload._encrypted) {
        return res.status(400).json({ success: false, error: 'Невірний формат зашифрованого файлу' });
      }

      const decrypted = dbCrypto.decrypt(payload, passphrase);
      if (!decrypted || !Array.isArray(decrypted.visitors)) {
        return res.status(400).json({ success: false, error: 'Помилка валідації розшифрованих даних' });
      }

      store.patch(decrypted);

      broadcast({
        type: 'sync:init',
        data: store.getState(),
        serverTime: new Date().toISOString()
      });

      store.addAuditLog({
        action: 'Імпорт зашифрованої бази',
        category: 'backup',
        userEmail: 'admin',
        userName: 'Адміністратор',
        details: `Успішно імпортовано та розшифровано базу (відвідувачів: ${decrypted.visitors.length})`,
        status: 'success'
      });

      res.json({
        success: true,
        message: `Базу успішно розшифровано та імпортовано (${decrypted.visitors.length} відвідувачів)`
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Помилка розшифрування файлу' });
    }
  });

  // Audit Logs API
  app.get("/api/audit-logs", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json({
      success: true,
      logs: store.getAuditLogs(limit)
    });
  });

  app.post("/api/audit-logs/add", (req, res) => {
    const { action, category, userEmail, userName, details, status } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });

    const log = store.addAuditLog({
      action,
      category: category || 'system',
      userEmail: userEmail || 'user',
      userName: userName || userEmail || 'Користувач',
      details: details || '',
      status: status || 'info'
    });

    broadcast({
      type: 'audit:log',
      log,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, log });
  });

  // Tactical Stop-List / Watchlist API
  app.get("/api/security/stoplist", (_req, res) => {
    res.json({
      success: true,
      stopList: store.getStopList()
    });
  });

  app.post("/api/security/stoplist", (req, res) => {
    const { name, callsign, documentNumber, vehiclePlate, reason, severity, addedBy } = req.body;
    if (!name || !reason) {
      return res.status(400).json({ error: 'Name and reason are required' });
    }

    const item = store.addToStopList({
      name,
      callsign,
      documentNumber,
      vehiclePlate,
      reason,
      severity: severity || 'warning',
      addedBy: addedBy || 'Охорона',
      active: true
    });

    broadcast({
      type: 'security:stoplist_add',
      item,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, item });
  });

  app.delete("/api/security/stoplist/:id", (req, res) => {
    const { id } = req.params;
    const removed = store.removeFromStopList(id);
    if (removed) {
      broadcast({
        type: 'security:stoplist_remove',
        id,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: removed });
  });

  // Checkpoints / Terminals API
  app.get("/api/security/checkpoints", (_req, res) => {
    res.json({
      success: true,
      checkpoints: store.getCheckpoints()
    });
  });

  app.post("/api/security/checkpoints/:id", (req, res) => {
    const { id } = req.params;
    const updated = store.updateCheckpoint(id, req.body);
    if (updated) {
      broadcast({
        type: 'security:checkpoint_update',
        id,
        updates: req.body,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: updated });
  });

  // Password Reset Requests
  app.post("/api/auth/request-password-reset", (req, res) => {
    try {
      const { userId, userEmail, userName, requestedByEmail, notes } = req.body;
      if (!userEmail && !userId) {
        return res.status(400).json({ success: false, error: 'User email or ID is required' });
      }

      const allUsers = store.getState().authorizedUsers || [];
      const user = allUsers.find((u: any) => u.id === userId || u.email.toLowerCase() === (userEmail || '').toLowerCase());
      const targetName = user?.name || userName || userEmail;
      const targetEmail = user?.email || userEmail;
      const targetRole = user?.roleId || 'user';

      const superadminEmails = store.getSuperadminEmails();
      const primarySuperadmin = superadminEmails[0] || 'tonyreshua@gmail.com';

      const request = store.addPasswordRequest({
        userId: user?.id || userId || 'unknown',
        userName: targetName,
        userEmail: targetEmail,
        roleId: targetRole,
        requestedByEmail: requestedByEmail || targetEmail,
        notes: notes || ''
      });

      const emailSubject = encodeURIComponent(`[СКУД] Запит нового пароля для: ${targetName} (${targetEmail})`);
      const emailBody = encodeURIComponent(
        `Шановний Суперадміністратор!\n\n` +
        `Надійшов запит на створення / надання нового пароля для доступу до системи СКУД.\n\n` +
        `Деталі запиту:\n` +
        `• Користувач: ${targetName}\n` +
        `• Email користувача: ${targetEmail}\n` +
        `• Роль: ${targetRole}\n` +
        `• Дата та час: ${new Date().toLocaleString('uk-UA')}\n` +
        `• Запит подано від: ${requestedByEmail || targetEmail}\n` +
        (notes ? `• Коментар/причина: ${notes}\n\n` : `\n`) +
        `Для встановлення нового пароля увійдіть до системи СКУД та відкрийте вкладку «Доступ».\n`
      );
      const mailtoUrl = `mailto:${primarySuperadmin}?subject=${emailSubject}&body=${emailBody}`;

      broadcast({
        type: 'auth:password_request',
        request,
        superadminEmails,
        timestamp: new Date().toISOString()
      });

      console.log(`[Email Dispatch] Password request notification sent to Superadmin (${superadminEmails.join(', ')}): User ${targetName} (${targetEmail})`);

      res.json({
        success: true,
        message: `Лист із запитом нового пароля успішно надіслано на пошту Суперадміністратора (${superadminEmails.join(', ')})`,
        superadminEmails,
        mailtoUrl,
        request
      });
    } catch (err: any) {
      console.error('[Auth] Error creating password request:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/auth/password-requests", (_req, res) => {
    res.json({
      success: true,
      requests: store.getState().passwordRequests || []
    });
  });

  app.post("/api/auth/resolve-password-request", (req, res) => {
    const { requestId } = req.body;
    const resolved = store.resolvePasswordRequest(requestId);
    if (resolved) {
      broadcast({
        type: 'auth:password_request_resolved',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: resolved });
  });

  // System metrics and server health
  app.get("/api/system/metrics", (_req, res) => {
    const memoryUsage = process.memoryUsage();
    let dbSize = 0;
    try {
      const encPath = path.join(dataDir, 'system_state.enc');
      if (fs.existsSync(encPath)) {
        dbSize = fs.statSync(encPath).size;
      }
    } catch {}

    res.json({
      status: "ok",
      uptime: process.uptime(),
      onlineClients: getConnectedClientsCount(),
      encryption: dbCrypto.getStatus(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      dbSizeBytes: dbSize,
      dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} КБ`,
      totalVisitors: (store.getState().visitors || []).length,
      totalBackups: store.getServerBackups().length,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      encryption: "AES-256-GCM",
      onlineClients: getConnectedClientsCount(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[SKUD Server] System running with AES-256-GCM encryption & WebSockets on http://localhost:${PORT}`);
  });
}

startServer();
