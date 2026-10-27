export const formatNameAbbreviated = (fullName: string) => {
  if (!fullName) return '';
  const parts = fullName.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName.trim();
  
  const lastName = parts[0];
  const firstNameInitial = parts[1].charAt(0).toUpperCase();
  const middleNameInitial = parts[2] ? parts[2].charAt(0).toUpperCase() : '';
  
  return `${lastName} ${firstNameInitial}.${middleNameInitial ? middleNameInitial : ''}`;
};

/**
 * Splits a full name into Surname (Line 1) and First Name (Line 2),
 * strictly excluding any patronymic (по батькові / отчество).
 */
export const splitNameTwoLines = (fullName: string): { first: string; second: string } => {
  if (!fullName) return { first: '', second: '' };
  const parts = fullName.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', second: '' };
  if (parts.length === 1) return { first: parts[0], second: '' };
  
  const lastName = parts[0]; // Фамилия / Surname
  const firstName = parts[1]; // Имя / First name only (discards patronymic parts.slice(2))
  
  return { first: lastName, second: firstName };
};
