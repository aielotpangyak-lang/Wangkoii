const FORBIDDEN_WORDS = [
  'fuck', 'sex', 'nigger', 'nigga', 'scam', 'fraud', 'fake',
  'bitch', 'asshole', 'dick', 'pussy', 'bastard'
];

export function isProfane(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

export function filterUsername(username: string): boolean {
  // Username must be 6-20 chars, lowercase letters only
  const lowercaseLetters = /^[a-z]{6,20}$/;
  return lowercaseLetters.test(username);
}
