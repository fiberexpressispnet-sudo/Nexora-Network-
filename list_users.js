import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function list() {
  const usersRef = collection(db, "users");
  const usersSnap = await getDocs(usersRef);
  for (const userDoc of usersSnap.docs) {
      console.log("Found UID:", userDoc.id);
  }
}
list().then(() => process.exit(0)).catch(console.error);
