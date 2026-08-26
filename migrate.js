import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function migrate() {
  const usersRef = collection(db, "users");
  const usersSnap = await getDocs(usersRef);
  let adminUid = null;
  
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    if (uid === 'global_admin') continue;
    
    // Check if they have appData/feisp_clients
    const clientsRef = doc(db, "users", uid, "appData", "feisp_clients");
    const clientsSnap = await getDoc(clientsRef);
    if (clientsSnap.exists() && clientsSnap.data().value && clientsSnap.data().value.length > 0) {
      console.log("Found admin data under UID:", uid, "Clients count:", clientsSnap.data().value.length);
      adminUid = uid;
      break;
    }
  }
  
  if (adminUid) {
    console.log("Admin UID found:", adminUid);
    // You can write it to a file
    fs.writeFileSync('admin_uid.txt', adminUid);
  } else {
    console.log("No existing admin data found.");
  }
}
migrate().then(() => process.exit(0)).catch(console.error);
