const persianNameCharacters = /^[\p{Script=Arabic}\s\u200c'-]+$/u;

export function isPersianName(name: string): boolean {
  const normalizedName = name.trim();

  return (
    normalizedName.length > 0 &&
    persianNameCharacters.test(normalizedName) &&
    [...normalizedName].some(
      (character) => /\p{Script=Arabic}/u.test(character) && /\p{L}/u.test(character)
    )
  );
}

export function firstNameMatchesEmail(firstName: string, email: string): boolean {
  const normalizedFirstName = firstName.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  return normalizedFirstName.length > 0 && normalizedEmail.includes(normalizedFirstName);
}
