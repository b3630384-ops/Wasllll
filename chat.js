// تكوين Firebase المبدئي لمنع انهيار الصفحة
const firebaseConfig = {
  apiKey: "AIzaSyBM_LkZr59WM4fnTvW0CKbcj-y2V8Flqto",
  authDomain: "wasl-4f5cb.firebaseapp.com",
  projectId: "wasl-4f5cb",
  storageBucket: "wasl-4f5cb.firebasestorage.app",
  messagingSenderId: "754785038144",
  appId: "1:754785038144:web:ca48f718b71148ae3394a5",
  measurementId: "G-8TMN0ER8Z3"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

// متغيرات معرفات المستخدم الحالي في الشات النشط
let activeChatUserId = null; 
let currentActiveTargetId = null; 

// دالة نظام الترقية التلقائي للنظام الملكي
async function updateRoyalBadge(userId) {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    
    // حساب الأيام بناءً على تاريخ إنشاء الحساب (createdAt)
    const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
    const daysActive = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));

    let badge = '📜'; // الافتراضي: خادم البلاط
    let roleTitle = "خادم البلاط";

    // حساب الرتب الملكية بناءً على المدة الزمنية المحددة في الصورة
    if (daysActive >= 30) {
        badge = '👑'; // أمير
        roleTitle = "أمير";
    } else if (daysActive >= 7) {
        badge = '⚖️'; // بارون
        roleTitle = "بارون";
    } else if (daysActive >= 3) {
        badge = '🛡️'; // فارس
        roleTitle = "فارس";
    }

    // رتبة الملك مخصصة للمشرفين أو الحساب الموثق بملك
    if (data.role === 'admin' || data.isKing) {
        badge = '🏰'; 
        roleTitle = "الملك";
    }

    // تحديث البيانات في Firestore في حال حدوث ترقية جديدة فقط
    if (data.badge !== badge || data.roleTitle !== roleTitle) {
        await userRef.update({ 
            badge: badge,
            roleTitle: roleTitle
        });
    }
}

auth.onAuthStateChanged((user) => {
    if (user) {
        // تشغيل نظام الترقية للمستخدم الحالي فور دخوله
        updateRoyalBadge(user.uid);
  
        db.collection("users").doc(user.uid).update({
            status: "online"
        });
        const messaging = firebase.messaging();
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                messaging.getToken({ vapidKey: 'BGp2fqSEXHD6Ng1kPMlHf_EGBFHxvY4z_7BDprfeulkK9qncNSZh0iyjj4ISWyW5At4pvyM4bMplEA9xndlbcUk' })
                .then((currentToken) => {
                    if (currentToken) {
                        db.collection('users').doc(user.uid).update({
                            fcmToken: currentToken
                        });
                    }
                });
            }
        });

        // جلب بيانات الملف الشخصي
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const usernameInput = document.getElementById('profileUsername');
                if (usernameInput) usernameInput.value = doc.data().username || "";
            }
        });
    }
});

// التحكم بالقوائم والنوافذ
window.toggleMenu = function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function() {
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) dropdown.classList.add('hidden');
});

window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

window.closeModalOnOutsideClick = function(e, id) {
    if (e.target.id === id) { closeModal(id); }
}

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
}

window.previewImage = function(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const output = document.getElementById('avatarPreview');
        if (output) {
            output.innerText = "";
            output.style.backgroundImage = `url(${reader.result})`;
            output.style.backgroundSize = "cover";
        }
    }
    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// إضافة جهة اتصال في القائمة الجانبية
window.addNewContact = function() {
    const inputInput = document.getElementById('addSearchInput');
    if (!inputInput) return;
    const input = inputInput.value.trim();
    
    if(input) {
        const list = document.getElementById('contactsList');
        if (!list) return;
        const emptyMsg = list.querySelector('.empty-msg');
        if(emptyMsg) emptyMsg.remove();

        const item = document.createElement('div');
        item.classList.add('contact-item');
        item.innerHTML = `<div class="avatar">👤</div><div><h4>${input}</h4></div>`;
        
        item.onclick = function() {
            document.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            openPrivateChat(input);
        };

        list.appendChild(item);
        inputInput.value = "";
        closeModal('addPersonModal');
    }
}

function openPrivateChat(name) {
    const activeName = document.getElementById('activeChatName');
    const activeStatus = document.getElementById('activeChatStatus');
    const chatArea = document.getElementById('chatArea');
    const chatForm = document.getElementById('chatForm');
    const chatMessages = document.getElementById('chatMessages');

    if (activeName) activeName.innerText = name;
    if (activeStatus) activeStatus.innerText = "متصل حالياً";
    if (chatArea) chatArea.classList.remove('hidden');
    if (chatForm) chatForm.classList.remove('hidden');
    if (chatMessages) chatMessages.innerHTML = `<div class="welcome-chat">🔒 هذه بداية محادثتك الخاصة والمشفرة مع ${name}</div>`;
    
    if(window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('hidden-mobile');
    }
}

window.backToSidebar = function() {
    const chatArea = document.getElementById('chatArea');
    const sidebar = document.getElementById('sidebar');
    if (chatArea) chatArea.classList.add('hidden');
    if (sidebar) sidebar.classList.remove('hidden-mobile');
}

window.sendPrivateMessage = async function() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    const text = input.value.trim();
    if(!text) return;

    const currentUserId = window.activeChatUserId || activeChatUserId || currentActiveTargetId;
    if (!currentUserId) {
        alert("الرجاء اختيار مستخدم لبدء المحادثة معه أولاً!");
        return;
    }

    const myUid = auth.currentUser.uid;
    try {
        const blockCheck = await db.collection('users').doc(myUid).collection('blockedUsers').doc(currentUserId).get();
        if (blockCheck.exists) {
            alert("لا يمكنك إرسال رسائل إلى مستخدم قمت بحظره!");
            return;
        }

        await db.collection('messages').add({
            text: text,
            senderId: myUid,
            receiverId: currentUserId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = "";
        const box = document.getElementById('chatMessages');
        if (box) box.scrollTop = box.scrollHeight;
    } catch(error) {
        console.error("خطأ في التحقق أو الإرسال:", error);
    }
}

// كود إرسال حالة "جاري الكتابة"
const messageInput = document.getElementById('messageInput');
if (messageInput) {
    messageInput.addEventListener('input', () => {
        const currentUserId = window.activeChatUserId || currentActiveTargetId;
        if (currentUserId) {
            db.collection('users').doc(auth.currentUser.uid).update({
                typingTo: currentUserId
            });
        }
    });
}


window.saveProfile = function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("⚠️ يجب أن تكون مسجلاً للدخول لتعديل ملفك!");
        return;
    }

    const fullName = document.getElementById('profileFullName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    const birthdate = document.getElementById('profileBirthdate').value;
    const avatarInput = document.getElementById('avatarInput');

    if (!fullName || !username) {
        alert("📜 فضلاً، يرجى ملء الاسم الكامل واسم المستخدم أولاً!");
        return;
    }

    // دالة داخلية لحفظ البيانات النهائية في Firestore مباشرة
    function uploadData(avatarDataUrl = null) {
        const updateData = {
            fullName: fullName,
            username: username,
            birthdate: birthdate || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (avatarDataUrl) {
            updateData.avatarUrl = avatarDataUrl; // حفظ الصورة بنجاح كبيانات مشفرة
        }

        firebase.firestore().collection('users').doc(user.uid).set(updateData, { merge: true })
        .then(() => {
            alert("💾 تم حفظ تعديلات الملف الشخصي بنجاح، وستظهر للجميع فوراً!");
            closeModal('profileModal');
        })
        .catch((error) => {
            console.error("خطأ في الحفظ:", error);
            alert("❌ فشل في حفظ البيانات!");
        });
    }

    // تحويل الصورة إلى نص (Base64) وحفظها مباشرة داخل Firestore
    if (avatarInput && avatarInput.files.length > 0) {
        const file = avatarInput.files[0];
        
        // التحقق من حجم الصورة (يفضل أن تكون أصغر من 1 ميجا لسرعة الأداء)
        if (file.size > 1024 * 1024) {
            alert("⚠️ حجم الصورة كبير جداً، يرجى اختيار صورة أصغر لحفظها بسلاسة!");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            uploadData(e.target.result); 
        };
        reader.readAsDataURL(file);
    } else {
        uploadData(); // حفظ التعديلات النصية مباشرة إذا لم تتغير الصورة
    }
};




window.deleteAccountPermanently = function() {
    if(confirm("⚠️ هل أنت متأكد من حذف الحساب نهائياً؟")) {
        window.location.href = "index.html";
    }
}

// جلب مستخدمي فايربيس الحقيقيين وعرضهم في القائمة بالتحديثات الملكية
db.collection('users').onSnapshot((snapshot) => {
    const userList = document.getElementById('contactsList'); 
    if (!userList) return;

    if (snapshot.empty) {
        userList.innerHTML = '<p class="empty-msg">لا يوجد أشخاص مضافين حالياً. اضغط على (+) في الأسفل لإضافة صديق.</p>';
        return;
    }

    userList.innerHTML = '';

    snapshot.forEach((doc) => {
        const userData = doc.data();
        if (doc.id === auth.currentUser.uid) return;
        
        // تشغيل فحص وتحديث الرتبة لكل مستخدم يظهر في القائمة تلقائياً
        updateRoyalBadge(doc.id);

        const isTyping = userData.typingTo === auth.currentUser.uid;
        const currentRole = userData.roleTitle || "خادم البلاط";
        const currentBadge = userData.badge || "📜";
        
        const statusText = isTyping ? "✏️ يكتب الآن..." : (userData.status === 'online' ? `🟢 متصل | ${currentRole}` : `⚪ غير متصل | ${currentRole}`);
        const statusColor = isTyping ? "#f59e0b" : (userData.status === 'online' ? '#22c55e' : '#64748b');

        const userItem = document.createElement('div');
        userItem.classList.add('contact-item'); 
                
        userItem.innerHTML = `
            <div class="avatar">👤</div>
            <div>
                <h4>${userData.username || userData.email || "مستخدم مجهول"} ${currentBadge}</h4>
                <span style="font-size: 10px; color: ${statusColor}">${statusText}</span>
            </div>
        `;

        userItem.onclick = () => {
            document.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
            userItem.classList.add('active');

            activeChatUserId = doc.id;
            window.activeChatUserId = doc.id;
            currentActiveTargetId = doc.id; 

            const activeChatName = document.getElementById('activeChatName');
            if (activeChatName) {
                activeChatName.innerHTML = `${userData.username || userData.email || "مستخدم مجهول"} <span style="font-size:16px;">${currentBadge}</span>`;
            }
            
            const activeChatStatus = document.getElementById('activeChatStatus');
            if (activeChatStatus) {
                activeChatStatus.innerText = `الرتبة الملكية: ${currentRole}`;
            }

            const chatForm = document.getElementById('chatForm');
            if (chatForm) chatForm.classList.remove('hidden');

            loadPrivateMessages();

            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.add('hidden-mobile');
                const chatArea = document.getElementById('chatArea');
                if (chatArea) chatArea.classList.remove('hidden');
            }
        };

        userList.appendChild(userItem);
    });
});

// دالة عرض الرسائل الخاصة

function loadPrivateMessages() {
    const currentUserId = window.activeChatUserId || activeChatUserId || currentActiveTargetId;
    if (!currentUserId) return;

    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    if (window.privateChatUnsubscribe) {
        window.privateChatUnsubscribe();
    }

    window.privateChatUnsubscribe = db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            chatMessages.innerHTML = '';

            snapshot.forEach((doc) => {
                const data = doc.data();
                const isSentByMe = data.senderId === auth.currentUser.uid && data.receiverId === currentUserId;
                const isReceivedFromHim = data.senderId === currentUserId && data.receiverId === auth.currentUser.uid;

                if (isSentByMe || isReceivedFromHim) {
                    
                    // تحديث حالة القراءة للرسائل الواردة
                    if (isReceivedFromHim && data.isRead !== true) {
                        doc.ref.update({ isRead: true }).catch(err => console.error("خطأ تحديث القراءة:", err));
                    }

                    const msgDiv = document.createElement('div');
                    msgDiv.classList.add('message', isSentByMe ? 'sent' : 'received');

                    let reactionsHtml = '';
                    if (data.reactions) {
                        Object.keys(data.reactions).forEach(emoji => {
                            const count = data.reactions[emoji].length;
                            reactionsHtml += `<span class="reaction-badge">${emoji}${count}</span>`;
                        });
                    }

                    const actionButtonsHtml = isSentByMe ? `
                        <div class="message-actions" style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; display: flex; justify-content: space-around;">
                            <span onclick="editMessage('${doc.id}', \`${data.text}\`)" style="cursor:pointer; font-size:12px;">✏️ تعديل</span>
                            <span onclick="deleteMessage('${doc.id}')" style="cursor:pointer; font-size:12px; color:#ef4444;">🗑️ حذف</span>
                        </div>
                    ` : '';

                    // تحديد أيقونة الصح أو الصحين الأزرق
                    let statusHtml = '';
                    if (isSentByMe) {
                        if (data.isRead === true) {
                            statusHtml = `<span style="color: #38bdf8; margin-left: 6px; font-size: 13px; font-weight: bold; vertical-align: middle;">✓✓</span>`;
                        } else {
                            statusHtml = `<span style="color: #94a3b8; margin-left: 6px; font-size: 13px; vertical-align: middle;">✓</span>`;
                        }
                    }

                    // بناء الهيكل الداخلي للرسالة
                    msgDiv.innerHTML = `
                        <div class="message-text">
                            <span>${data.text}</span>
                            ${statusHtml}
                        </div>
                        <div class="reactions-container">${reactionsHtml}</div>
                        
                        <div id="emoji-menu-${doc.id}" class="emoji-menu">
                            <div class="emojis-row" style="display:flex; justify-content: space-around; margin-bottom: 4px;">
                                <span onclick="addReaction('${doc.id}', '❤️')">❤️</span>
                                <span onclick="addReaction('${doc.id}', '👍')">👍</span>
                                <span onclick="addReaction('${doc.id}', '😂')">😂</span>
                                <span onclick="addReaction('${doc.id}', '💚')">💚</span>
                            </div>
                        </div>
                        
                    `;

                    // تفعيل ميزة الضغط المطول
                    if (typeof setupLongPress === 'function') {
                        setupLongPress(msgDiv, doc.id);
                    }

                    // حساب وتنسيق الوقت أسفل الرسالة
                    const time = data.timestamp ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                    const timeDiv = document.createElement('div');
                    timeDiv.style.fontSize = "10px";
                    timeDiv.style.marginTop = "4px";
                    timeDiv.style.opacity = "0.7";
                    timeDiv.innerText = time;
                    
                    msgDiv.appendChild(timeDiv);
                    chatMessages.appendChild(msgDiv);
                }
            });

            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
}

                  




      
// الاستماع لحدث اختيار صورة
document.getElementById('imageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = firebase.storage().ref('chat_images/' + Date.now() + file.name);
    storageRef.put(file).then(snapshot => {
        snapshot.ref.getDownloadURL().then(url => {
            db.collection('messages').add({
                text: "📷 صورة",
                imageUrl: url, 
                senderId: auth.currentUser.uid,
                receiverId: window.activeChatUserId || currentActiveTargetId, 
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    }).catch(error => {
        console.error("خطأ في رفع الصورة: ", error);
        alert("حدث خطأ أثناء رفع الصورة");
    });
});

function setupLongPress(element, messageId) {
    let pressTimer;
    element.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            const menu = document.getElementById('emoji-menu-' + messageId);
            if (menu) {
                document.querySelectorAll('.emoji-menu').forEach(m => m.style.display = 'none');
                menu.style.display = 'block';
                menu.style.top = '-55px'; 
                menu.style.left = '50%';
                menu.style.transform = 'translateX(-50%)';
            }
        }, 800);
    });
    element.addEventListener('touchend', () => clearTimeout(pressTimer));
    element.addEventListener('touchmove', () => clearTimeout(pressTimer));
}

function addReaction(messageId, emoji) {
    db.collection('messages').doc(messageId).update({
        [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid)
    }).then(() => {
        const menu = document.getElementById('emoji-menu-' + messageId);
        if (menu) menu.style.display = 'none';
    });
}

window.deleteMessage = function(messageId) {
    if (confirm("⚠️ هل تريد حذف هذه الرسالة للجميع؟")) {
        db.collection('messages').doc(messageId).delete()
        .then(() => { console.log("تم الحذف بنجاح"); })
        .catch(error => { console.error("خطأ بالحذف:", error); alert("لم نتمكن من حذف الرسالة."); });
    }
}

window.editMessage = function(messageId, currentText) {
    const newText = prompt("✏️ قم بتعديل رسالتك:", currentText);
    if (newText !== null && newText.trim() !== "") {
        db.collection('messages').doc(messageId).update({ text: newText.trim() })
        .then(() => { console.log("تم تعديل الرسالة بنجاح"); })
        .catch(error => { console.error("خطأ بالتعديل:", error); alert("لم نتمكن من تعديل الرسالة."); });
    }
}

window.openTargetProfile = async function() {
    if (!currentActiveTargetId) {
        alert("يرجى اختيار صديق أولاً لبدء المحادثة وعرض ملفه الشخصي.");
        return; 
    }
    try {
        const userDoc = await db.collection('users').doc(currentActiveTargetId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // إضافة الرتبة واللقب في الملف الشخصي المعروض للصديق أيضاً
            const userBadge = userData.badge || "📜";
            const userRole = userData.roleTitle || "خادم البلاط";

            document.getElementById('targetFullName').innerText = (userData.fullName || userData.username || "لا يوجد اسم") + " " + userBadge;
            document.getElementById('targetUsername').innerText = "@" + (userData.username || "بدون_مستخدم") + ` (${userRole})`;
            
            const avatarDiv = document.getElementById('targetAvatar');
            if (userData.avatarUrl) {
                avatarDiv.innerHTML = `<img src="${userData.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else { avatarDiv.innerText = "💬"; }

            openModal('targetProfileModal');
        } else { alert("لم يتم العثور على بيانات هذا المستخدم."); }
    } catch (error) { console.error("خطأ في جلب البيانات:", error); }
}

window.handleBlockAction = async function() {
    if (!currentActiveTargetId) return;
    if (confirm("هل أنت متأكد من أنك تريد حظر هذا المستخدم؟ لن تتمكنا من المراسلة مجدداً.")) {
        const myUid = auth.currentUser.uid;
        try {
            await db.collection('users').doc(myUid).collection('blockedUsers').doc(currentActiveTargetId).set({
                blockedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("تم الحظر بنجاح.");
            closeModal('targetProfileModal');
            location.reload();
        } catch (error) { console.error("خطأ أثناء الحظر:", error); }
    }
}
// 3️⃣ دالة الإبلاغ عن المستخدم
window.handleReportAction = async function() {
    if (!currentActiveTargetId) return;

    const reason = prompt("يرجى كتابة سبب الإبلاغ عن هذا المستخدم:");
    if (reason === null) return; 
    if (reason.trim() === "") {
        alert("يجب كتابة سبب للإبلاغ.");
        return;
    }

    try {
        await db.collection('reports').add({
            reportedUserId: currentActiveTargetId,
            reportedBy: auth.currentUser.uid,
            reason: reason.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("📢 تم إرسال بلاغك بنجاح للمراجعة والتدقيق. شكراً لك!");
        closeModal('targetProfileModal');
    } catch (error) {
        console.error("خطأ أثناء الإبلاغ:", error);
        alert("حدث خطأ أثناء إرسال البلاغ.");
    }
}

// 4️⃣ دالة جلب وعرض قائمة المحظورين في الإعدادات
window.loadBlockedUsers = async function() {
    const myUid = auth.currentUser.uid;
    const container = document.getElementById('blockedUsersContainer');
    const listArea = document.getElementById('blockedListArea');

    if (!container || !listArea) return;

    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        return;
    }

    listArea.innerHTML = "<p style='font-size:12px; color:#64748b;'>جاري تحميل القائمة...</p>";
    container.classList.remove('hidden');

    try {
        const blockedSnapshot = await db.collection('users').doc(myUid).collection('blockedUsers').get();
        
        if (blockedSnapshot.empty) {
            listArea.innerHTML = "<p style='font-size:12px; color:#22c55e;'>لا يوجد مستخدمون محظورون حالياً.</p>";
            return;
        }

        listArea.innerHTML = ""; 

        blockedSnapshot.forEach(async (blockedDoc) => {
            const blockedUserId = blockedDoc.id;
            
            const userDoc = await db.collection('users').doc(blockedUserId).get();
            const username = userDoc.exists ? (userDoc.data().username || userDoc.data().email) : "مستخدم مجهول";

            const row = document.createElement('div');
            row.style.display = "flex";
            row.style.justify = "space-between";
            row.style.alignItems = "center";
            row.style.marginBottom = "6px";
            row.style.background = "rgba(255,255,255,0.05)";
            row.style.padding = "6px 10px";
            row.style.borderRadius = "6px";

            row.innerHTML = `
                <span style="font-size: 13px;">${username}</span>
                <button onclick="unblockUser('${blockedUserId}')" style="background:#22c55e; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">إلغاء الحظر</button>
            `;
            listArea.appendChild(row);
        });

    } catch (error) {
        console.error("خطأ في جلب المحظورين:", error);
        listArea.innerHTML = "<p style='font-size:12px; color:#ef4444;'>حدث خطأ أثناء جلب القائمة.</p>";
    }
}

// 5️⃣ دالة إلغاء الحظر
window.unblockUser = async function(blockedUserId) {
    if (confirm("هل تريد إلغاء الحظر عن هذا المستخدم؟")) {
        const myUid = auth.currentUser.uid;
        try {
            await db.collection('users').doc(myUid).collection('blockedUsers').doc(blockedUserId).delete();
            alert("تم إلغاء الحظر بنجاح.");
            location.reload(); 
        } catch (error) {
            console.error("خطأ في إلغاء الحظر:", error);
            alert("فشل إلغاء الحظر.");
        }
    }
}

// ==========================================
//  تطوير ميزة المراسيم الملكية (الحالات)
// ==========================================

// 1. فتح وإغلاق النافذة وتنظيف المدخلات
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        
        // إذا كانت النافذة هي نافذة المرسوم، ننظف الحقول بعد الإغلاق
        if (modalId === 'addStoryModal') {
            document.getElementById('storyTextInput').value = '';
            document.getElementById('storyImageInput').value = '';
            document.getElementById('storyImagePreview').innerHTML = '';
        }
    }
}

// الإغلاق الذكي عند الضغط خارج صندوق المحتوى
function closeModalOnOutsideClick(event, modalId) {
    if (event.target.id === modalId) {
        closeModal(modalId);
    }
}

// 2. معالجة ومعاينة الصورة الملكية فور اختيارها
function previewStoryImage(event) {
    const previewContainer = document.getElementById('storyImagePreview');
    previewContainer.innerHTML = ''; // تنظيف المعاينة السابقة
    
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxHeight = '140px';
            img.style.borderRadius = '8px';
            img.style.objectFit = 'cover';
            previewContainer.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
}

// خطوة 1: دالة نشر نص المرسوم إلى Firebase
async function publishRoyalDecree() {
    // 1. الإمساك بصندوق النص المكتوب
    const textInput = document.getElementById('storyTextInput');
    const text = textInput.value.trim();
    
    // 2. التأكد أن المستخدم كتب شيئاً ولم يترك الحقل فارغاً
    if (!text) {
        alert('عذراً يا مولاي، اكتب نص المرسوم أولاً قبل النشر!');
        return;
    }

    try {
        // 3. إرسال النص إلى جدول في Firebase نسميه (royal_stories)
        await firebase.firestore().collection('royal_stories').add({
            text: text, // النص الذي كتبته
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // وقت النشر تلقائياً
        });

        // 4. رسالة نجاح وإغلاق النافذة
        alert('📢 تم إرسال المرسوم الملكي إلى قاعدة البيانات بنجاح!');
        closeModal('addStoryModal');

    } catch (error) {
        // في حال حدوث أي مشكلة (مثلاً عدم تفعيل قاعدة البيانات)
        console.error("حدث خطأ أثناء النشر:", error);
        alert("لم نتمكن من النشر، تأكد من إعدادات الفايربيس: " + error.message);
    }
}


// خطوة 2: دالة الاستماع للمراسيم الملكية وعرضها حية في شريط الحالات
function listenToRoyalStories() {
    const storiesContainer = document.getElementById('royalStoriesContainer');
    
    if (!storiesContainer) return; // للتأكد من وجود الشريط في الـ HTML

    // جلب المراسيم حية وترتيبها من الأحدث للأقدم
    firebase.firestore().collection('royal_stories')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            
            // 1. إعادة وضع زر "مرسومك" الثابت أولاً حتى لا يختفي
            storiesContainer.innerHTML = `
                <div class="story-circle add-story-btn" onclick="openModal('addStoryModal')">
                    <div class="story-avatar">➕</div>
                    <span class="story-name">مرسومك</span>
                </div>
            `;

            // 2. تكرار وعرض المراسيم القادمة من الفايربيس
            snapshot.forEach((doc) => {
                const story = doc.data();
                
                // إنشاء دائرة لكل مرسوم جديد
                const storyElement = document.createElement('div');
                storyElement.className = 'story-circle';
                
                // عند الضغط على الدائرة تظهر رسالة بنص المرسوم
                storyElement.onclick = () => {
                    alert(`📜 مرسوم ملكي:\n\n"${story.text}"`);
                };

                storyElement.innerHTML = `
                    <div class="story-avatar">📜</div>
                    <span class="story-name">مرسوم جديد</span>
                `;

                storiesContainer.appendChild(storyElement);
            });
        }, (error) => {
            console.error("خطأ في جلب المراسيم:", error);
        });
}

// تشغيل دالة جلب المراسيم فور تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    listenToRoyalStories();
});



// الدالة النهائية لجلب فرسان المملكة الحقيقيين من Firebase
function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    leaderboardList.innerHTML = '<p style="text-align:center; color:#64748b;">⚡ جاري استدعاء فرسان المملكة الحقيقيين...</p>';

    // جلب المستخدمين المسجلين وترتيبهم حسب النقاط
    firebase.firestore().collection('users')
        .get()
        .then((snapshot) => {
            leaderboardList.innerHTML = ''; // تنظيف القائمة

            if (snapshot.empty) {
                leaderboardList.innerHTML = '<p style="text-align:center; color:#64748b;">🏰 لا يوجد مستخدمين مسجلين في المملكة بعد!</p>';
                return;
            }

            // تحويل البيانات إلى مصفوفة لترتيبها بشكل صحيح
            let usersArray = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                usersArray.push({
                    fullName: data.fullName || 'عضو ملكي',
                    username: data.username || 'user',
                    points: data.points || 0
                });
            });

            // ترتيب المستخدمين من الأعلى نقاطاً إلى الأقل
            usersArray.sort((a, b) => b.points - a.points);

            // عرض أعلى 10 مستخدمين حقيقيين فقط
            const topUsers = usersArray.slice(0, 10);

            let index = 1;
            topUsers.forEach((user) => {
                createLeaderboardItem(leaderboardList, index, user.fullName, user.username, user.points);
                index++;
            });
        })
        .catch((error) => {
            console.error("خطأ في جلب لوحة الشرف الحقيقية:", error);
            leaderboardList.innerHTML = '<p style="text-align:center; color:#ef4444;">❌ فشل في الاتصال بقاعدة البيانات الملكية</p>';
        });
}

// دالة إنشاء عناصر اللوحة وتنسيقها بشكل متميز
function createLeaderboardItem(container, index, name, username, points) {
    let medal = `🏅 ${index}`;
    if (index === 1) medal = '🥇';
    if (index === 2) medal = '🥈';
    if (index === 3) medal = '🥉';

    const item = document.createElement('div');
    item.className = `leaderboard-item rank-${index <= 3 ? index : 'default'}`;
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.background = 'rgba(255, 255, 255, 0.05)';
    item.style.padding = '15px';
    item.style.borderRadius = '12px';
    item.style.marginBottom = '10px';
    item.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    
    if (index === 1) { item.style.borderColor = '#d4af37'; item.style.background = 'rgba(212, 175, 55, 0.08)'; }
    if (index === 2) { item.style.borderColor = '#38bdf8'; item.style.background = 'rgba(56, 189, 248, 0.08)'; }
    if (index === 3) { item.style.borderColor = '#f97316'; item.style.background = 'rgba(249, 115, 22, 0.08)'; }

    item.innerHTML = `
        <span style="color: #d4af37; font-weight: bold; font-size: 15px;">✨ ${points} نقطة</span>
        <div style="display: flex; align-items: center; gap: 12px; text-align: right;">
            <div>
                <strong style="color: #fff; display: block; font-size: 16px;">${name}</strong>
                <span style="font-size: 12px; color: #94a3b8;">@${username}</span>
            </div>
            <span style="font-size: 24px; display: flex; align-items: center;">${medal}</span>
        </div>
    `;
    container.appendChild(item);
}


// دالة إرسال النميمة والاعترافات سراً إلى قاعدة البيانات
function sendAnonymousGossip() {
    const gossipText = document.getElementById('gossipText');
    
    // 1. التأكد أن المستخدم كتب شيئاً ولم يترك الصندوق فارغاً
    if (!gossipText || gossipText.value.trim() === "") {
        alert("🚨 أرجوك اكتب سرك أو نميمتك أولاً قبل الإرسال!");
        return;
    }

    const textToSend = gossipText.value.trim();

    // 2. إرسال البيانات إلى الفايربيس (بدون أي معلومات عن الهوية)
    firebase.firestore().collection('gossip').add({
        content: textToSend,          // نص النميمة
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // وقت الإرسال للترتيب
    })
    .then(() => {
        alert("🤫 تم نفث سرك في أروقة المملكة بنجاح وسرية تامة!");
        gossipText.value = ""; // تنظيف الصندوق بعد الإرسال
        closeModal('gossipModal'); // إغلاق النافذة تلقائياً
    })
    .catch((error) => {
        console.error("خطأ في إرسال النميمة:", error);
        alert("❌ فشل إرسال النميمة، تأكد من اتصالك بالإنترنت.");
    });
}



// دالة لجلب وعرض النمائم من قاعدة البيانات في "جريدة النميمة الملكية"
function loadNewspaper() {
    const gossipList = document.getElementById('gossipList');
    if (!gossipList) return;

    // إظهار حالة التحميل
    gossipList.innerHTML = '<p style="text-align:center; color:#64748b;">⏳ جاري فك طلاسم الأسرار الملكية...</p>';

    // جلب النمائم مرتبة من الأحدث إلى الأقدم
    firebase.firestore().collection('gossip')
        .orderBy('timestamp', 'desc')
        .get()
        .then((snapshot) => {
            gossipList.innerHTML = ''; // تنظيف القائمة

            if (snapshot.empty) {
                gossipList.innerHTML = '<p style="text-align:center; color:#64748b;">🤫 الأروقة هادئة جداً حالياً، لا توجد نمائم بعد!</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // إنشاء عنصر لكل نميمة
                const item = document.createElement('div');
                item.style.padding = '12px';
                item.style.background = 'rgba(255, 255, 255, 0.03)';
                item.style.borderRight = '3px solid #8b5cf6';
                item.style.borderRadius = '6px';
                item.style.marginBottom = '10px';
                item.style.fontSize = '14px';
                item.style.color = '#f8fafc';
                
                item.innerHTML = `
                    <div style="font-style: italic;">"${data.content}"</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 8px; text-align: left;">
                        ${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('ar-EG') : 'منذ قليل'}
                    </div>
                `;
                gossipList.appendChild(item);
            });
        })
        .catch((error) => {
            console.error("خطأ في جلب جريدة النميمة:", error);
            gossipList.innerHTML = '<p style="text-align:center; color:#ef4444;">❌ فشل في فتح الجريدة الملكية!</p>';
        });
}



// دالة لتشغيل/إطفاء الجرس أو فتح نافذة الإشعارات عند الضغط عليه
function toggleNotifications() {
    const badge = document.getElementById('notificationBadge');
    
    // مثال تفاعلي: عند الضغط على الجرس يتم تصفير العداد وإخفاء الشارة الحمراء
    if (badge) {
        badge.textContent = '0';
        badge.classList.add('hidden');
    }
    
    alert('🔔 لا توجد إشعارات ملكية جديدة حالياً!');
}

// دالة يمكنك استدعاؤها برمجياً لزيادة عدد الإشعارات وتفعيل الشارة الحمراء
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge && count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    }
}



// مراقبة المستخدمين وحفظ بيانات المسجلين الجدد تلقائياً في الـ Firestore
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // إذا دخل مستخدم، نتحقق فوراً هل إيميله مسجل في مجلد users أم لا
        const userRef = firebase.firestore().collection('users').doc(user.uid);
        
        userRef.get().then((doc) => {
            if (!doc.exists) {
                // إذا كان مستخدم جديد تماماً وليس له ملف، نحفظ بياناته فوراً لكي تطلع عليها
                userRef.set({
                    uid: user.uid,
                    email: user.email || "لا يوجد بريد",
                    phoneNumber: user.phoneNumber || "لا يوجد رقم",
                    displayName: user.displayName || "مستخدم جديد",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true })
                .then(() => {
                    console.log("تم رصد مستخدم جديد وحفظ بياناته بنجاح!");
                })
                .catch((err) => console.error("خطأ في حفظ البيانات:", err));
            }
        });
    }
});





// تحديث الكود ليضيف الملك والمطور
const myUid = "IB9c5FMQefeeB9Oapp7ByWlyKIe2";
const myName = "احمد"; // تأكد من مطابقة الاسم

const observer = new MutationObserver(() => {
    // التعديل في القائمة وداخل المحادثة
    document.querySelectorAll('.contact-item, .chat-header').forEach(item => {
        if (item.innerText.includes(myName)) {
            // إضافة التاج وكلمة "الملك" إذا لم تكن موجودة
            if (!item.querySelector('.king-badge')) {
                const nameContainer = item.querySelector('h4') || item.querySelector('.chat-header-name');
                if (nameContainer) {
                    nameContainer.innerHTML += ' <span class="king-badge">👑 الملك</span>';
                }
            }
            // إضافة وسام المطور
            if (!item.querySelector('.developer-badge')) {
                const nameContainer = item.querySelector('h4') || item.querySelector('.chat-header-name');
                if (nameContainer) {
                    nameContainer.innerHTML += ' <span class="developer-badge">المطور</span>';
                }
            }
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });



// الكود الشامل لتحديث الرتبة والأسماء
const observerFix = new MutationObserver(() => {
    // 1. البحث وتغيير "خادم البلاط" إلى "الرتبة الملكية: الملك"
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        // نتحقق من أن العنصر لا يحتوي على عناصر فرعية أخرى لضمان تغيير النص الصحيح
        if (el.innerText && el.innerText.trim() === "خادم البلاط" && el.children.length === 0) {
            el.innerText = "الرتبة الملكية: الملك";
            el.style.color = "#ffd700"; // تلوين الرتبة بالذهبي
            el.style.fontWeight = "bold";
        }
    });

    // 2. البحث عن اسمك "احمد" لإضافة الأوسمة
    const nameElements = document.querySelectorAll('*');
    nameElements.forEach(el => {
        // البحث عن العنصر الذي يحوي اسمك فقط
        if (el.innerText && el.innerText.trim() === "احمد" && !el.querySelector('.king-badge')) {
            el.innerHTML += ' <span class="king-badge">👑</span> <span class="developer-badge">المطور</span>';
        }
    });
});

// تفعيل المراقبة
observerFix.observe(document.body, { childList: true, subtree: true });





// التعديل الملكي النهائي
setInterval(() => {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        if (el.innerText && el.innerText.trim() === "الرتبة الملكية: خادم البلاط") {
            
            el.innerHTML = ""; 
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.gap = "10px";

            // كلمة "الملك" بتوهج ذهبي
            const kingText = document.createElement('span');
            kingText.innerHTML = "الملك 👑";
            kingText.style.color = "#FFD700";
            kingText.style.fontWeight = "bold";
            kingText.style.fontSize = "8px";
            kingText.style.textShadow = "0 0 12px #FFD700"; // توهج ذهبي مشع

            // كلمة "المطور" بحجم أكبر قليلاً مع توهج وردي
            const devText = document.createElement('span');
            devText.innerHTML = "المطور";
            devText.style.background = "#FF69B4";
            devText.style.color = "#fff";
            devText.style.padding = "3px 7px";
            devText.style.borderRadius = "6px";
            devText.style.boxShadow = "0 0 10px #FF69B4"; // توهج وردي مشع
            devText.style.fontSize = "5px"; // حجم أكبر قليلاً
            devText.style.fontWeight = "bold";

            el.appendChild(kingText);
            el.appendChild(devText);
        }
    });
}, 500);





// كود تفعيل لقب الملك المطور للمدير فقط
setInterval(() => {
    // هذا هو الـ ID الخاص بك الذي استخرجناه من لوحة التحكم
    const myUserId = "iB9c5FMQefeeB9Oapp7ByWlyKle2"; 

    // البحث عن جميع عناصر الأسماء في الدردشة
    // ملاحظة: إذا لم يتغير شيء، تأكد من أن اسم الكلاس (user-name) هو نفسه المستخدم في تطبيقك
    const userElements = document.querySelectorAll('.user-name, .message-sender'); 

    userElements.forEach(el => {
        // نتحقق إذا كان العنصر يخصك (بناءً على الـ ID) أو يحمل اسمك
        if (el.getAttribute('data-uid') === myUserId || el.innerText.includes("احمد")) {
            // نمنع التكرار لكي لا يضيف الكود التاج أكثر من مرة
            if (!el.classList.contains('is-king-processed')) {
                el.innerHTML = `
                    <span class="king-title">الملك 👑</span> 
                    <span class="king-dev-badge">المطور</span>
                `;
                el.classList.add('is-king-processed'); 
            }
        }
    });
}, 1000);
          
