import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 👇 Yahan apna firebaseConfig paste karo (sirf { ... } wala hissa)
const firebaseConfig = {
  apiKey: "AIzaSyA0EbKQq0UsqJ3-6c90WLNemOW3dXu7by8",
  authDomain: "lost-found-ai-e83ef.firebaseapp.com",
  projectId: "lost-found-ai-e83ef",
  storageBucket: "lost-found-ai-e83ef.firebasestorage.app",
  messagingSenderId: "917087112517",
  appId: "1:917087112517:web:31e7eca2b0e007916f022c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

AOS.init();
console.log("Firebase connected:", app.options.projectId);
// ---- Page ke elements pakadna ----
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl = document.getElementById("auth-msg");
const authBox = document.getElementById("auth-box");
const homeBox = document.getElementById("home-box");
const userEmailEl = document.getElementById("user-email");

// ---- Error ko aasaan Hinglish mein dikhana ----
function friendlyError(code) {
  if (code === "auth/invalid-email") return "Email sahi nahi hai.";
  if (code === "auth/weak-password") return "Password kam se kam 6 characters ka rakho.";
  if (code === "auth/email-already-in-use") return "Ye email pehle se registered hai, Login karo.";
  if (code === "auth/invalid-credential") return "Email ya password galat hai.";
  return "Something went wrong , Try again.";
}

// ---- Sign up ----
document.getElementById("signup-btn").addEventListener("click", async () => {
  msgEl.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
  } catch (e) {
    msgEl.textContent = friendlyError(e.code);
  }
});

// ---- Login ----
document.getElementById("login-btn").addEventListener("click", async () => {
  msgEl.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
  } catch (e) {
    msgEl.textContent = friendlyError(e.code);
  }
});

// ---- Logout ----
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

// ---- Login hai ya nahi, ye Firebase khud batata hai ----
onAuthStateChanged(auth, (user) => {
  if (user) {
    authBox.classList.add("hidden");
    homeBox.classList.remove("hidden");
    userEmailEl.textContent = user.email;
  } else {
    homeBox.classList.add("hidden");
    authBox.classList.remove("hidden");
  }
});
// ---- Photo ko chhota karke tayyar karna ----
let photoData = "";
const previewEl = document.getElementById("photo-preview");

document.getElementById("item-photo").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 600 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      photoData = canvas.toDataURL("image/jpeg", 0.6);
      previewEl.src = photoData;
      previewEl.classList.remove("hidden");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ---- Post button ----
const postMsg = document.getElementById("post-msg");

document.getElementById("post-btn").addEventListener("click", async () => {
  const name = document.getElementById("item-name").value.trim();
  const description = document.getElementById("item-desc").value.trim();
  const place = document.getElementById("item-place").value.trim();
  const foundTime = document.getElementById("item-time").value;
  const secret = document.getElementById("item-secret").value.trim();

  if (!name || !place || !foundTime || !secret || !photoData) {
    postMsg.className = "text-center text-sm mt-3 text-red-400";
    postMsg.textContent = "Naam, location, time, photo aur hidden detail, sab bharna zaroori hai.";
    return;
  }
    if (aiStatus === "declined") {
    postMsg.className = "text-center text-sm mt-3 text-red-400";
    postMsg.textContent = "❌ AI-generated photo post nahi ho sakti. Asli photo kheencho.";
    return;
  }

  try {
    postMsg.className = "text-center text-sm mt-3 text-slate-400";
    postMsg.textContent = "Post ho raha hai...";

    // 1) Public hissa
    const itemRef = await addDoc(collection(db, "items"), {
      name, description, place, foundTime,
      photo: photoData,
      finderId: auth.currentUser.uid,
            status: "open",
      aiStatus,
      aiScore,
      createdAt: serverTimestamp()
    });

    // 2) Private hissa (same ID se, alag collection mein)
    await setDoc(doc(db, "secrets", itemRef.id), {
      secret,
      finderId: auth.currentUser.uid
    });

    postMsg.className = "text-center text-sm mt-3 text-green-400";
    postMsg.textContent = "Item post ho gaya ✅";

    // Form saaf karna
    ["item-name", "item-desc", "item-place", "item-time", "item-secret", "item-photo"]
      .forEach((id) => (document.getElementById(id).value = ""));
    previewEl.classList.add("hidden");
    photoData = "";
  } catch (e) {
    console.error(e);
    postMsg.className = "text-center text-sm mt-3 text-red-400";
    postMsg.textContent = "Post nahi hua, Console (F12) mein error dekho.";
  }
});
// ---- Chhota helper: element banana ----
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// ---- Ek item ka card banana ----
function renderItem(id, it) {
  const mine = it.finderId === auth.currentUser.uid;

  const card = makeEl("div", "bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4");
  const img = makeEl("img", "w-full h-48 object-cover");
  img.src = it.photo;
  img.alt = it.name;

  const body = makeEl("div", "p-4");
  body.appendChild(makeEl("h3", "text-xl", it.name));
    if (it.aiStatus === "verified") {
    body.appendChild(makeEl("p", "text-green-400 text-xs mt-1", "✅ Real photo verified"));
  } else if (it.aiStatus === "suspicious") {
    body.appendChild(makeEl("p", "text-amber-400 text-xs mt-1", "⚠️ Unverified photo"));
  }
  if (it.description) body.appendChild(makeEl("p", "text-slate-300 text-sm mt-1", it.description));
  body.appendChild(makeEl("p", "text-slate-400 text-sm mt-2", "📍 " + it.place));
  body.appendChild(makeEl("p", "text-slate-400 text-sm", "🕒 " + new Date(it.foundTime).toLocaleString()));

  if (mine) {
    body.appendChild(makeEl("p", "text-amber-400 text-sm mt-3", "Ye tumne post kiya hai"));
  } else {
    const claimBtn = makeEl("button", "mt-3 px-4 py-2 rounded-lg bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition", "Ye meri cheez hai");

    const claimBox = makeEl("div", "hidden mt-3");
    const ta = makeEl("textarea", "w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-amber-400");
    ta.rows = 2;
    ta.placeholder = "Aisi detail likho jo sirf asli owner ko pata ho (andar kya tha, koi nishaan, etc.)";
    const sendBtn = makeEl("button", "mt-2 px-4 py-2 rounded-lg border border-amber-400 text-amber-400 hover:bg-amber-400/10 transition", "Claim bhejo");
    const msg = makeEl("p", "text-sm mt-2");
    claimBox.append(ta, sendBtn, msg);

    claimBtn.addEventListener("click", () => claimBox.classList.toggle("hidden"));

    sendBtn.addEventListener("click", async () => {
      const answer = ta.value.trim();
      if (!answer) {
        msg.className = "text-sm mt-2 text-red-400";
        msg.textContent = "Pehle detail likho.";
        return;
      }
      try {
        await setDoc(doc(db, "claims", id + "_" + auth.currentUser.uid), {
          itemId: id,
          finderId: it.finderId,
          claimerId: auth.currentUser.uid,
          answer,
          status: "pending",
          createdAt: serverTimestamp()
        });
        msg.className = "text-sm mt-2 text-green-400";
        msg.textContent = "Claim bhej diya ✅ Finder verify karega.";
        ta.value = "";
      } catch (e) {
        console.error(e);
        msg.className = "text-sm mt-2 text-red-400";
        msg.textContent = "Claim nahi gaya, Console (F12) dekho.";
      }
    });

    body.append(claimBtn, claimBox);
  }

  card.append(img, body);
  return card;
}

// ---- Items ki live list ----
const listEl = document.getElementById("items-list");
let unsubscribeItems = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    unsubscribeItems = onSnapshot(q, (snap) => {
      listEl.innerHTML = "";
      if (snap.empty) {
        listEl.appendChild(makeEl("p", "text-slate-400", "Abhi koi item nahi hai."));
        return;
      }
      snap.forEach((d) => listEl.appendChild(renderItem(d.id, d.data())));
    });
  } else {
    if (unsubscribeItems) unsubscribeItems();
    unsubscribeItems = null;
    listEl.innerHTML = "";
  }
});
// ---- Ek claim ka card banana ----
async function renderClaim(claimDoc) {
  const c = claimDoc.data();

  // Item ka naam aur finder ki apni hidden detail laana
  const itemSnap = await getDoc(doc(db, "items", c.itemId));
  const secretSnap = await getDoc(doc(db, "secrets", c.itemId));
  const itemName = itemSnap.exists() ? itemSnap.data().name : "Item";
  const mySecret = secretSnap.exists() ? secretSnap.data().secret : "(nahi mili)";

  const card = makeEl("div", "bg-white/5 border border-amber-400/30 rounded-2xl p-4 mb-4");
  card.appendChild(makeEl("h3", "text-xl", itemName));

  card.appendChild(makeEl("p", "text-slate-400 text-sm mt-3", "Claimer ne likha:"));
  card.appendChild(makeEl("p", "bg-slate-800 rounded-lg p-3 mt-1", c.answer));

  card.appendChild(makeEl("p", "text-slate-400 text-sm mt-3", "🔒 Tumhari hidden detail:"));
  card.appendChild(makeEl("p", "bg-slate-800 rounded-lg p-3 mt-1", mySecret));

  const row = makeEl("div", "flex gap-3 mt-4");
  const approveBtn = makeEl("button", "px-4 py-2 rounded-lg bg-green-500 text-slate-900 font-semibold hover:bg-green-400 transition", "Approve ✅");
  const rejectBtn = makeEl("button", "px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:bg-red-400/10 transition", "Reject ❌");

  approveBtn.addEventListener("click", () => {
  const note = window.prompt("Milne ka tareeka likho (jaise: Library counter pe, 5 baje). Phone ya email mat likhna:");
  updateDoc(doc(db, "claims", claimDoc.id), {
    status: "approved",
    note: note || "Finder se milne ka tareeka tay karo"
  });
});
  rejectBtn.addEventListener("click", () =>
    updateDoc(doc(db, "claims", claimDoc.id), { status: "rejected" }));

  row.append(approveBtn, rejectBtn);
  card.appendChild(row);
  return card;
}

// ---- Claims ki live list (sirf mere items ke, sirf pending) ----
const claimsListEl = document.getElementById("claims-list");
let unsubscribeClaims = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    const q = query(
      collection(db, "claims"),
      where("finderId", "==", user.uid),
      where("status", "==", "pending")
    );
    unsubscribeClaims = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        claimsListEl.innerHTML = "";
        claimsListEl.appendChild(makeEl("p", "text-slate-400", "Abhi koi pending claim nahi hai."));
        return;
      }
      const cards = await Promise.all(snap.docs.map(renderClaim));
      claimsListEl.innerHTML = "";
      cards.forEach((card) => claimsListEl.appendChild(card));
    });
  } else {
    if (unsubscribeClaims) unsubscribeClaims();
    unsubscribeClaims = null;
    claimsListEl.innerHTML = "";
  }
});
// ---- Meri claims (claimer ka panel) ----
async function renderMyClaim(claimDoc) {
  const c = claimDoc.data();

  const itemSnap = await getDoc(doc(db, "items", c.itemId));
  if (!itemSnap.exists()) {
    // Item delete ho chuka hai, to meri claim bhi hata do
    await deleteDoc(doc(db, "claims", claimDoc.id));
    return null;
  }

  const card = makeEl("div", "bg-white/5 border border-white/10 rounded-2xl p-4 mb-4");
  card.appendChild(makeEl("h3", "text-xl", itemSnap.data().name));

  if (c.status === "pending") {
    card.appendChild(makeEl("p", "text-slate-400 mt-2", "⏳ Finder verify kar raha hai..."));
  }

  if (c.status === "rejected") {
    card.appendChild(makeEl("p", "text-red-400 mt-2", "❌ Claim reject hua."));
    const removeBtn = makeEl("button", "mt-3 px-4 py-2 rounded-lg border border-slate-600 hover:bg-white/10 transition", "Hatao");
    removeBtn.addEventListener("click", () => deleteDoc(doc(db, "claims", claimDoc.id)));
    card.appendChild(removeBtn);
  }

  if (c.status === "approved") {
    card.appendChild(makeEl("p", "text-green-400 mt-2", "✅ Claim approve ho gaya!"));
    card.appendChild(makeEl("p", "text-slate-400 text-sm mt-3", "Milne ka tareeka:"));
    card.appendChild(makeEl("p", "bg-slate-800 rounded-lg p-3 mt-1", c.note || ""));

    const foundBtn = makeEl("button", "mt-4 px-4 py-2 rounded-lg bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition", "FOUND ✅ (cheez mil gayi)");
    foundBtn.addEventListener("click", async () => {
      if (!confirm("Cheez mil gayi? Saari details hamesha ke liye delete ho jaayengi.")) return;
      // Claim sabse aakhir mein delete hoti hai
      await deleteDoc(doc(db, "secrets", c.itemId));
      await deleteDoc(doc(db, "items", c.itemId));
      await deleteDoc(doc(db, "claims", claimDoc.id));
    });
    card.appendChild(foundBtn);
  }

  return card;
}

const myClaimsEl = document.getElementById("my-claims-list");
let unsubscribeMyClaims = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    const q = query(collection(db, "claims"), where("claimerId", "==", user.uid));
    unsubscribeMyClaims = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        myClaimsEl.innerHTML = "";
        myClaimsEl.appendChild(makeEl("p", "text-slate-400", "Tumne abhi koi claim nahi bheji."));
        return;
      }
      const cards = await Promise.all(snap.docs.map(renderMyClaim));
      myClaimsEl.innerHTML = "";
      cards.filter(Boolean).forEach((card) => myClaimsEl.appendChild(card));
    });
  } else {
    if (unsubscribeMyClaims) unsubscribeMyClaims();
    unsubscribeMyClaims = null;
    myClaimsEl.innerHTML = "";
  }
});
// ---- Webcam se photo ----
const camBtn = document.getElementById("cam-open");
const camBox = document.getElementById("cam-box");
const videoEl = document.getElementById("cam-video");
const snapBtn = document.getElementById("cam-snap");
const camCloseBtn = document.getElementById("cam-close");
let camStream = null;

function stopCam() {
  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
  videoEl.srcObject = null;
  camBox.classList.add("hidden");
}

camBtn.addEventListener("click", async () => {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoEl.srcObject = camStream;
    camBox.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    postMsg.className = "text-center text-sm mt-3 text-red-400";
    postMsg.textContent = "Camera nahi khula. Browser mein Allow dabao.";
  }
});

snapBtn.addEventListener("click", () => {
  if (!videoEl.videoWidth) return;
  const scale = Math.min(1, 600 / videoEl.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth * scale;
  canvas.height = videoEl.videoHeight * scale;
  canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  photoData = canvas.toDataURL("image/jpeg", 0.6);
  previewEl.src = photoData;
  previewEl.classList.remove("hidden");
  stopCam();
});

camCloseBtn.addEventListener("click", stopCam);
// ---- AI photo check (Sightengine) ----
const SE_USER =  "50840057"
const SE_SECRET = "dSiAPj2bYLe7UW2CAAuR7u3KXrpPcJoy"

let aiStatus = "unchecked";
let aiScore = null;

async function checkPhoto(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("media", blob, "photo.jpg");
  form.append("models", "genai");
  form.append("api_user", SE_USER);
  form.append("api_secret", SE_SECRET);

  const res = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: form
  });
  const data = await res.json();
  if (data.status !== "success") throw new Error("check fail");
  return data.type.ai_generated; // 0 se 1 ke beech
}

// Ye listener webcam wale "Photo kheencho" button pe judta hai
// (pehla listener photo save karta hai, ye uske baad chalta hai)
document.getElementById("cam-snap").addEventListener("click", async () => {
  aiStatus = "unchecked";
  aiScore = null;
  postMsg.className = "text-center text-sm mt-3 text-slate-400";
  postMsg.textContent = "🤖 AI check ho raha hai...";

  try {
    aiScore = await checkPhoto(photoData);
    if (aiScore < 0.3) {
      aiStatus = "verified";
      postMsg.className = "text-center text-sm mt-3 text-green-400";
      postMsg.textContent = "✅ Real photo verified";
    } else if (aiScore < 0.7) {
      aiStatus = "suspicious";
      postMsg.className = "text-center text-sm mt-3 text-amber-400";
      postMsg.textContent = "⚠️ Photo thodi suspicious hai, unverified tag ke saath post hogi";
    } else {
      aiStatus = "declined";
      postMsg.className = "text-center text-sm mt-3 text-red-400";
      postMsg.textContent = "❌ Ye photo AI-generated lag rahi hai. Asli photo kheencho.";
    }
  } catch (e) {
    console.error(e);
    aiStatus = "unchecked";
    postMsg.className = "text-center text-sm mt-3 text-slate-400";
    postMsg.textContent = "AI check nahi ho paya, photo bina verify ke post hogi.";
  }
});