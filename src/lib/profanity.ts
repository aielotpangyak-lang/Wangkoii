const FORBIDDEN_WORDS = [
  'fuck', 'sex', 'nigger', 'nigga', 'scam', 'fraud', 'fake',
  'bitch', 'asshole', 'dick', 'pussy', 'bastard'
];

export function isProfane(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

export function filterUsername(username: string): boolean {
  // Username must be 6-20 chars, lowercase letters and numbers only
  const lowercaseAlphanumeric = /^[a-z0-9]{6,20}$/;
  return lowercaseAlphanumeric.test(username);
}
