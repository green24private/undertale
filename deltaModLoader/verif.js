 (async () => {
     'use strict';

     const VERIFICATION_PAGE_URL = 'verif.html';

     function getPrivateKeyFromVault() {
         return new Promise((resolve, reject) => {
             const request = indexedDB.open('DELTARUNE_VAULT', 1);
             request.onerror = () => reject("Failed to open IndexedDB. Verification cannot proceed.");
             request.onsuccess = (event) => {
                 const db = event.target.result;
                 if (!db.objectStoreNames.contains('CryptoKeys')) {
                     console.error("IndexedDB store 'CryptoKeys' not found. User needs to re-verify.");
                     resolve(null);
                     return;
                 }
                 const transaction = db.transaction('CryptoKeys', 'readonly');
                 const store = transaction.objectStore('CryptoKeys');
                 const keyRequest = store.get('BrowserVerificationKey');
                 keyRequest.onsuccess = () => {
                     resolve(keyRequest.result || null);
                 };
                 keyRequest.onerror = () => {
                     reject("Failed to retrieve key from IndexedDB.");
                 };
             };
         });
     }

     async function protectPage() {
         const verifurl = `${VERIFICATION_PAGE_URL}?redirect=${window.location.pathname}`;
         const publicKeyJwkString = localStorage.getItem("DR_PUBLIC_KEY");

         if (!publicKeyJwkString) {
             window.location.href = verifurl;
             return;
         }

         try {
             const privateKey = await getPrivateKeyFromVault();
             const publicKeyJwk = JSON.parse(publicKeyJwkString);

             if (!privateKey) {
                 window.location.href = verifurl;
                 return;
             }

             const challenge = crypto.getRandomValues(new Uint8Array(32));
             const signature = await crypto.subtle.sign(
                 { name: 'ECDSA', hash: { name: 'SHA-256' } },
                 privateKey,
                 challenge
             );

             const publicKey = await crypto.subtle.importKey(
                 "jwk", publicKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]
             );

             const isVerified = await crypto.subtle.verify(
                 { name: "ECDSA", hash: { name: "SHA-256" } },
                 publicKey,
                 signature,
                 challenge
             );

             if (isVerified) {
             } else {
                 window.location.href = verifurl;
             }
         } catch (error) {
             window.location.href = verifurl;
         }
     }

     protectPage();

 })();
