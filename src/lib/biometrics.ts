// WebAuthn Biometric Authentication Helper (Fingerprint / Touch ID / Face ID)

export const isInsideIframe = (): boolean => {
 try {
 return typeof window !== 'undefined' && window.self !== window.top;
 } catch (e) {
 return true;
 }
};

export const isBiometricsSupported = async (): Promise<boolean> => {
 if (typeof window === 'undefined' || !window.PublicKeyCredential) {
 return false;
 }
 // Cross-origin iframes without WebAuthn delegation cannot access hardware biometrics
 if (isInsideIframe()) {
 return false;
 }
 try {
 const doc = document as any;
 if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
 if (!doc.featurePolicy.allowsFeature('publickey-credentials-get')) {
 return false;
 }
 }
 if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
 if (!doc.permissionsPolicy.allowsFeature('publickey-credentials-get')) {
 return false;
 }
 }

 if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
 return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
 }
 return false;
 } catch (e) {
 return false;
 }
};

// Helper to convert Uint8Array / ArrayBuffer to Base64URL
export const bufferToBase64 = (buffer: ArrayBuffer): string => {
 const bytes = new Uint8Array(buffer);
 let binary = '';
 for (let i = 0; i < bytes.byteLength; i++) {
 binary += String.fromCharCode(bytes[i]);
 }
 return btoa(binary)
 .replace(/\+/g, '-')
 .replace(/\//g, '_')
 .replace(/=+$/, '');
};

// Helper to convert Base64URL to Uint8Array
export const base64ToBuffer = (base64: string): Uint8Array => {
 let str = base64.replace(/-/g, '+').replace(/_/g, '/');
 while (str.length % 4) {
 str += '=';
 }
 const binary = atob(str);
 const bytes = new Uint8Array(binary.length);
 for (let i = 0; i < binary.length; i++) {
 bytes[i] = binary.charCodeAt(i);
 }
 return bytes;
};

// Register biometric fingerprint on the current device
export const registerDeviceBiometrics = async (
 appName: string = 'Nexora network Admin',
 userName: string = 'Admin'
): Promise<{ success: boolean; credentialId?: string; error?: string; isIframeBlocked?: boolean }> => {
 try {
 const supported = await isBiometricsSupported();
 if (!supported && isInsideIframe()) {
 return {
 success: false,
 isIframeBlocked: true,
 error: 'ব্রাউজার আইফ্রেম সিকিউরিটির কারণে ফিঙ্গারপ্রিন্ট অ্যাক্সেস সীমাবদ্ধ। অনুগ্রহ করে নতুন ট্যাবে অ্যাপটি খুলুন।',
 };
 }

 if (!supported) {
 return {
 success: false,
 error: 'আপনার ডিভাইসে বায়োমেট্রিক / ফিঙ্গারপ্রিন্ট সেন্সর পাওয়া যায়নি বা ব্রাউজারে সাপোর্ট নেই।',
 };
 }

 const randomChallenge = new Uint8Array(32);
 window.crypto.getRandomValues(randomChallenge);

 const userIdBytes = new TextEncoder().encode('nexora_admin_user_id');

 const publicKeyOptions: PublicKeyCredentialCreationOptions = {
 challenge: randomChallenge,
 rp: {
 name: appName,
 id: window.location.hostname,
 },
 user: {
 id: userIdBytes,
 name: userName,
 displayName: `${appName} Admin`,
 },
 pubKeyCredParams: [
 { alg: -7, type: 'public-key' }, // ES256
 { alg: -257, type: 'public-key' }, // RS256
 ],
 authenticatorSelection: {
 authenticatorAttachment: 'platform', // Physical phone fingerprint / TouchID / Windows Hello
 userVerification: 'required', // Forces real biometric verification
 residentKey: 'preferred',
 },
 timeout: 60000,
 attestation: 'none',
 };

 const credential = (await navigator.credentials.create({
 publicKey: publicKeyOptions,
 })) as PublicKeyCredential | null;

 if (!credential) {
 return { success: false, error: 'ফিঙ্গারপ্রিন্ট নিবন্ধন ব্যর্থ হয়েছে।' };
 }

 const credentialId = bufferToBase64(credential.rawId);
 return { success: true, credentialId };
 } catch (err: any) {
 console.warn('Biometric registration error caught:', err);
 const msg = err?.message || '';
 if (err.name === 'SecurityError' || msg.includes('publickey-credentials') || msg.includes('Permissions Policy')) {
 return {
 success: false,
 isIframeBlocked: true,
 error: 'আইফ্রেম মোডে ব্রাউজার পলিসি ফিঙ্গারপ্রিন্ট ব্লক করেছে। নতুন ট্যাবে অ্যাপটি ওপেন করুন অথবা প্যাটার্ন লক ব্যবহার করুন।',
 };
 }
 if (err.name === 'NotAllowedError') {
 return { success: false, error: 'ফিঙ্গারপ্রিন্ট রিকোয়েস্ট বাতিল করা হয়েছে।' };
 }
 return { success: false, error: err?.message || 'ফিঙ্গারপ্রিন্ট সেটআপ ব্যর্থ হয়েছে।' };
 }
};

// Authenticate via registered biometric fingerprint
export const verifyDeviceBiometrics = async (
 credentialId?: string
): Promise<{ success: boolean; error?: string; isIframeBlocked?: boolean }> => {
 try {
 const supported = await isBiometricsSupported();
 if (!supported && isInsideIframe()) {
 return {
 success: false,
 isIframeBlocked: true,
 error: 'আইফ্রেম মোডে ফিঙ্গারপ্রিন্ট ব্লক রয়েছে। নতুন ট্যাবে অ্যাপ খুলুন বা প্যাটার্ন ব্যবহার করুন।',
 };
 }

 if (!supported) {
 return {
 success: false,
 error: 'ডিভাইসে বায়োমেট্রিক সেন্সর পাওয়া যায়নি।',
 };
 }

 const randomChallenge = new Uint8Array(32);
 window.crypto.getRandomValues(randomChallenge);

 const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
 challenge: randomChallenge,
 rpId: window.location.hostname,
 userVerification: 'required', // Strictly enforces genuine physical fingerprint check
 timeout: 60000,
 };

 if (credentialId) {
 publicKeyRequestOptions.allowCredentials = [
 {
 id: base64ToBuffer(credentialId),
 type: 'public-key',
 transports: ['internal'],
 },
 ];
 }

 const assertion = await navigator.credentials.get({
 publicKey: publicKeyRequestOptions,
 });

 if (assertion) {
 return { success: true };
 }

 return { success: false, error: 'ফিঙ্গারপ্রিন্ট ম্যাচ করেনি।' };
 } catch (err: any) {
 console.warn('Biometric verification error caught:', err);
 const msg = err?.message || '';
 if (err.name === 'SecurityError' || msg.includes('publickey-credentials') || msg.includes('Permissions Policy')) {
 return {
 success: false,
 isIframeBlocked: true,
 error: 'আইফ্রেম মোডে ব্রাউজার পলিসি ফিঙ্গারপ্রিন্ট ব্লক করেছে। নতুন ট্যাবে খুলুন বা প্যাটার্ন ড্র করুন।',
 };
 }
 if (err.name === 'NotAllowedError') {
 return { success: false, error: 'ফিঙ্গারপ্রিন্ট যাচাই বাতিল করা হয়েছে বা আঙুলের ছাপ মিলেনি।' };
 }
 return { success: false, error: err?.message || 'ফিঙ্গারপ্রিন্ট অথেন্টিকেশন ব্যর্থ।' };
 }
};
