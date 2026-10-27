import React, { useState } from 'react';
import { useData } from '../store/DataContext';
import { Search, User, Users, Pencil, Trash2, X, Check, Plus, ChevronDown, Star } from 'lucide-react';
import { useToast } from '../store/ToastContext';
import { compareVisitorsSpecialFirst } from '../utils/visitorUtils';
import VoiceSearchInput from './VoiceSearchInput';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
  '#ec4899', '#f43f5e', '#64748b'
];

export default function VisitorManagement() {
  const { visitors, setVisitors, categories, groups, locations, customIcons } = useData();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitorToDelete, setVisitorToDelete] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCallsign, setNewCallsign] = useState('');
  const [newCat, setNewCat] = useState(categories[0] || '');
  const [newLocation, setNewLocation] = useState(locations[0]?.id || '');
  const [newGroup, setNewGroup] = useState(groups[0]?.id || '');
  const [newColor, setNewColor] = useState('');
  const [newIsSpecial, setNewIsSpecial] = useState(false);
  const [newCustomIconId, setNewCustomIconId] = useState<string>('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCallsign, setEditCallsign] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsSpecial, setEditIsSpecial] = useState(false);
  const [editCustomIconId, setEditCustomIconId] = useState<string>('');

  const normalizeForSearch = (str: string) => {
    return str.toLowerCase()
      .replace(/['`’ʼ.,!?]/g, '')
      .replace(/[иіїыi]/g, 'i')
      .replace(/[еєэe]/g, 'e')
      .replace(/[гґg]/g, 'g')
      .replace(/[аa]/g, 'a')
      .replace(/[оo]/g, 'o')
      .replace(/[рp]/g, 'p')
      .replace(/[сc]/g, 'c')
      .replace(/[хx]/g, 'x')
      .replace(/[уy]/g, 'y');
  };

  const matchesSearch = (name: string, callsign: string | undefined, searchStr: string) => {
    const normName = normalizeForSearch(name);
    const normCallsign = callsign ? normalizeForSearch(callsign) : '';
    const searchWords = normalizeForSearch(searchStr).split(/\s+/).filter(w => w.length > 0);
    if (searchWords.length === 0) return true;
    return searchWords.every(word => normName.includes(word) || normCallsign.includes(word));
  };

  const filtered = visitors
    .filter(v => matchesSearch(v.name, v.callsign, search))
    .sort((a, b) => compareVisitorsSpecialFirst(a, b, { groups }));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    const trimmedCallsign = newCallsign.trim();
    
    if (!trimmedName) return;

    const isDuplicateName = visitors.some(v => v.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicateName) {
      alert(`Користувач з ім'ям "${trimmedName}" вже є в базі!`);
      return;
    }

    if (trimmedCallsign) {
      const isDuplicateCallsign = visitors.some(v => v.callsign?.toLowerCase() === trimmedCallsign.toLowerCase());
      if (isDuplicateCallsign) {
        alert(`Користувач з позивним "${trimmedCallsign}" вже є в базі!`);
        return;
      }
    }
    
    try {
      setVisitors(prev => [...prev, {
        id: Date.now().toString(),
        name: trimmedName,
        callsign: trimmedCallsign || undefined,
        category: newCat || categories[0] || '',
        locationId: newLocation || locations[0]?.id || '',
        location: locations.find(l => l.id === (newLocation || locations[0]?.id))?.name || '',
        groupId: newGroup || groups[0]?.id || '',
        group: groups.find(g => g.id === (newGroup || groups[0]?.id))?.name || '',
        status: 'out',
        totalTimeMinutes: 0,
        color: newColor,
        isSpecial: newIsSpecial,
        customIconId: newCustomIconId || undefined
      }]);
      showToast(`Успішно додано користувача: ${trimmedName}`, 'success');
      setNewName('');
      setNewCallsign('');
      setNewColor('');
      setNewIsSpecial(false);
      setNewCustomIconId('');
      setIsAdding(false);
    } catch (error) {
      showToast(`Помилка при додаванні: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const startEditing = (v: any) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditCallsign(v.callsign || '');
    setEditCat(v.category);
    const loc = locations.find(l => l.id === v.locationId) || locations.find(l => l.name === v.location);
    setEditLocation(loc?.id || locations[0]?.id || '');
    setEditGroupId(v.groupId || groups.find(g => g.name === v.group)?.id || groups[0]?.id || '');
    setEditColor(v.color || '');
    setEditIsSpecial(v.isSpecial || false);
    setEditCustomIconId(v.customIconId || '');
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    try {
      setVisitors(prev => prev.map(v => {
        if (v.id === editingId) {
          const foundGroup = groups.find(g => g.id === editGroupId);
          const foundLocation = locations.find(l => l.id === editLocation);
          return { 
            ...v, 
            name: editName, 
            callsign: editCallsign.trim() || undefined,
            category: editCat, 
            locationId: editLocation, 
            location: foundLocation?.name || v.location, 
            groupId: editGroupId, 
            group: foundGroup?.name || v.group, 
            color: editColor,
            isSpecial: editIsSpecial,
            customIconId: editCustomIconId || undefined
          };
        }
        return v;
      }));
      showToast(`Успішно збережено зміни: ${editName}`, 'success');
      setEditingId(null);
    } catch (error) {
      showToast(`Помилка при збереженні: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const confirmDeleteVisitor = (id: string) => {
    setVisitorToDelete(id);
  };

  const executeDelete = () => {
    if (visitorToDelete) {
      const visitor = visitors.find(v => v.id === visitorToDelete);
      setVisitors(prev => prev.filter(v => v.id !== visitorToDelete));
      showToast(`Користувача ${visitor?.name || ''} видалено`, 'info');
      setVisitorToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <VoiceSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Пошук користувача..."
              containerClassName="w-full sm:w-80"
            />
            {/* Display total users count to the right of search */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-muted-foreground shadow-2xs select-none self-start sm:self-auto">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span>Загальна кількість:</span>
              <span className="font-bold font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                {search.trim() ? `${filtered.length} з ${visitors.length}` : `${visitors.length} користувачів`}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="w-full justify-center sm:w-auto flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Додати</span>
          </button>
        </div>

        <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
          {/* Scrollable table container that preserves exact desktop table columns on all resolutions */}
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              {/* Table Header */}
              <div className="grid grid-cols-[64px_1fr_140px_140px_100px] sm:grid-cols-[72px_1fr_150px_150px_110px] bg-muted/60 text-muted-foreground border-b border-border select-none text-[10px] font-bold uppercase tracking-wider">
                <div className="px-2 py-2.5 border-r border-border text-center">Іконка / Колір</div>
                <div className="px-3 sm:px-4 py-2.5 border-r border-border">Користувач</div>
                <div className="px-3 sm:px-4 py-2.5 border-r border-border">Бригада</div>
                <div className="px-3 sm:px-4 py-2.5 border-r border-border">Група</div>
                <div className="px-2 py-2.5 text-center">Дії</div>
              </div>

              <div className="divide-y divide-border">
                {filtered.length === 0 && (
                  <div className="px-6 py-12 text-center text-muted-foreground text-xs">
                    Користувачі не знайдені
                  </div>
                )}
                {filtered.map((v, idx) => {
                  const visitorGroup = groups.find(g => g.id === v.groupId) || groups.find(g => g.name === v.group);
                  const visitorLocation = locations.find(l => l.id === v.locationId) || locations.find(l => l.name === v.location);
                  const customIcon = customIcons.find(icon => icon.id === v.customIconId) || (visitorLocation?.iconId ? customIcons.find(icon => icon.id === visitorLocation.iconId) : null);
                  const blockColor = v.color || visitorGroup?.color;
                  const hasGroupColor = !!blockColor && blockColor !== 'transparent';
                  
                  const rowStyles = hasGroupColor ? {
                    backgroundColor: blockColor.startsWith('#') ? `${blockColor}15` : blockColor,
                  } : {};
                  
                  return (
                    <div 
                      key={v.id ? `visitor-${v.id}` : `visitor-idx-${idx}`} 
                      className="grid grid-cols-[64px_1fr_140px_140px_100px] sm:grid-cols-[72px_1fr_150px_150px_110px] items-center hover:bg-muted/30 transition-colors py-2 px-0"
                      style={rowStyles}
                    >
                      {/* Icon Column */}
                      <div className="flex items-center justify-center border-r border-border h-full py-1">
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden ${customIcon ? '' : 'shadow-xs'}`} 
                          style={{ backgroundColor: customIcon ? 'transparent' : (v.color || visitorGroup?.color || '#5b6984') }}
                        >
                          {customIcon ? (
                            <img src={customIcon.data} alt="user icon" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-[#e5e9ec]" />
                          )}
                        </div>
                      </div>

                      {/* Info Column */}
                      <div className="flex flex-col px-3 sm:px-4 py-1 border-r border-border min-w-0 justify-center">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          {v.category && !v.category.toLowerCase().includes('особлив') && (
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{v.category}</span>
                          )}
                          {v.isSpecial && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-yellow-500/15 text-yellow-600 font-bold">
                              <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                              Особливий
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-sm sm:text-base leading-tight text-foreground truncate">{v.name}</div>
                        {v.callsign && (
                          <div className="text-[10px] font-bold text-primary/80 uppercase tracking-[0.15em] truncate">{v.callsign}</div>
                        )}
                      </div>

                      {/* Brigade Column */}
                      <div className="flex items-center px-3 sm:px-4 py-1 border-r border-border min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {v.location || v.locationId || v.group || '—'}
                        </span>
                      </div>

                      {/* Group Column */}
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-1 border-r border-border min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: visitorGroup?.color || 'currentColor' }} />
                        <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground truncate">
                          {visitorGroup?.name || v.group || '—'}
                        </span>
                      </div>

                      {/* Actions Column */}
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-1">
                        <button 
                          onClick={() => startEditing(v)} 
                          className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer" 
                          title="Редагувати користувача"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDeleteVisitor(v.id)} 
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer" 
                          title="Видалити користувача"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg max-h-[92dvh] sm:max-h-[86vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/70 flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Pencil className="w-4.5 h-4.5 text-primary" />
                <span>Редагувати користувача</span>
              </h2>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Звання</label>
                <select 
                  value={editCat} 
                  onChange={e => setEditCat(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px] cursor-pointer"
                >
                  <option value="">Виберіть звання...</option>
                  {categories.map((c, idx) => <option key={`edit-cat-${c}-${idx}`} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">ПІБ *</label>
                <input 
                  required
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Позивний (опціонально)</label>
                <input 
                  type="text" 
                  value={editCallsign}
                  onChange={e => setEditCallsign(e.target.value)}
                  placeholder="Введіть позивний"
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Бригада</label>
                <select 
                  value={editLocation} 
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px] cursor-pointer"
                >
                  <option value="">Виберіть бригаду...</option>
                  {locations.map((l, idx) => <option key={`edit-loc-${l.id || idx}`} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Група</label>
                <select 
                  value={editGroupId} 
                  onChange={e => setEditGroupId(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px] cursor-pointer"
                >
                  <option value="">Виберіть групу...</option>
                  {groups.map((g, idx) => <option key={`edit-grp-${g.id || idx}`} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Власний колір виділення</label>
                <div className="relative">
                  <select 
                    value={editColor} 
                    onChange={e => setEditColor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none min-h-[42px] cursor-pointer"
                  >
                    <option value="">Не виділяти кольором</option>
                    {COLORS.map((c, idx) => (
                      <option key={`edit-color-${c}-${idx}`} value={c}>
                        Колір {c}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-border" style={{ backgroundColor: editColor || 'transparent' }} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Власна іконка</label>
                <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-xl bg-background">
                  <button
                    type="button"
                    onClick={() => setEditCustomIconId('')}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${!editCustomIconId ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50'}`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                  {customIcons.map((icon, idx) => (
                    <button
                      key={icon.id ? `edit-modal-icon-${icon.id}` : `edit-modal-icon-idx-${idx}`}
                      type="button"
                      onClick={() => setEditCustomIconId(icon.id)}
                      className={`aspect-square rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${editCustomIconId === icon.id ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50'}`}
                    >
                      <img src={icon.data} alt={icon.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className={`p-2 rounded-lg ${editIsSpecial ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
                  <Star className={`w-4 h-4 ${editIsSpecial ? 'fill-yellow-500' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">Особливий статус</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Буде відображатись на початку списку</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsSpecial(!editIsSpecial)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${editIsSpecial ? 'bg-yellow-500' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editIsSpecial ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                </div>
              </div>
              
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-border/70 bg-muted/20 shrink-0 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-all text-xs font-semibold cursor-pointer"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Зберегти зміни
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg max-h-[92dvh] sm:max-h-[86vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/70 flex items-center justify-between shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-primary" />
                <span>Додати користувача</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Звання</label>
                <select 
                  value={newCat} 
                  onChange={e => setNewCat(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                >
                  <option key="default-cat" value="">Виберіть звання...</option>
                  {categories.map((c, idx) => <option key={`new-cat-${c}-${idx}`} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">ПІБ *</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Позивний (опціонально)</label>
                <input 
                  type="text" 
                  value={newCallsign}
                  onChange={e => setNewCallsign(e.target.value)}
                  placeholder="Введіть позивний"
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Бригада</label>
                <select 
                  value={newLocation} 
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                >
                  <option key="default-loc" value="">Виберіть...</option>
                  {locations.map((l, idx) => <option key={`new-loc-${l.id || idx}`} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Група</label>
                <select 
                  value={newGroup} 
                  onChange={e => setNewGroup(e.target.value)}
                  className="w-full px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow min-h-[42px]"
                >
                  <option key="default-grp" value="">Виберіть групу...</option>
                  {groups.map((g, idx) => <option key={`new-grp-${g.id || idx}`} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Власний колір виділення (Опціонально)</label>
                <div className="relative">
                  <select 
                    value={newColor} 
                    onChange={e => setNewColor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none min-h-[42px]"
                  >
                    <option key="default-color" value="">Не виділяти кольором</option>
                    {COLORS.map((c, idx) => (
                      <option key={`new-color-${c}-${idx}`} value={c}>
                        Колір {c}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-border" style={{ backgroundColor: newColor || 'transparent' }} />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Власна іконка</label>
                <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-xl bg-background">
                  <button
                    type="button"
                    onClick={() => setNewCustomIconId('')}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${!newCustomIconId ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50'}`}
                  >
                    <User className="w-5 h-5" />
                  </button>
                      {customIcons.map((icon, idx) => (
                        <button
                          key={icon.id ? `modal-icon-${icon.id}` : `modal-icon-idx-${idx}`}
                          type="button"
                          onClick={() => setNewCustomIconId(icon.id)}
                          className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${newCustomIconId === icon.id ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50'}`}
                        >
                          <img src={icon.data} alt={icon.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className={`p-2 rounded-lg ${newIsSpecial ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>
                  <Star className={`w-4 h-4 ${newIsSpecial ? 'fill-yellow-500' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">Особливий статус</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Буде відображатись на початку списку</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewIsSpecial(!newIsSpecial)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newIsSpecial ? 'bg-yellow-500' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newIsSpecial ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
              
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-border/70 bg-muted/20 shrink-0 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-all text-xs font-semibold cursor-pointer"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {visitorToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-sm p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-border max-h-[92dvh] my-auto text-center animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Видалити користувача?</h2>
            <p className="text-xs text-muted-foreground mt-1.5 mb-5 leading-relaxed">
              Ви впевнені, що хочете видалити цього користувача з бази? Буде видалена також вся історія відвідувань. Цю дію неможливо скасувати.
            </p>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setVisitorToDelete(null)}
                className="flex-1 py-2 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button 
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2 px-3 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-destructive/90 shadow-sm transition-all cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
