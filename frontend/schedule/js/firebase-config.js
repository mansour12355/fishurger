// ===================================
// Firebase Configuration
// ===================================

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDH78fxDaNoqGAzyuPvuGMAoI09xlm8G_8",
    authDomain: "schedulesfishburger.firebaseapp.com",
    projectId: "schedulesfishburger",
    storageBucket: "schedulesfishburger.firebasestorage.app",
    messagingSenderId: "90025578074",
    appId: "1:90025578074:web:a23dc45d6b4d1e2b0b5263",
    measurementId: "G-02T4XQD19G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection references
const tasksCollection = collection(db, 'tasks');
const messagesCollection = collection(db, 'messages');
const activitiesCollection = collection(db, 'activities');

// ===================================
// Firebase Database Operations
// ===================================

// TASKS
async function fetchTasks() {
    const snapshot = await getDocs(tasksCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addTask(task) {
    const docRef = await addDoc(tasksCollection, task);
    return { id: docRef.id, ...task };
}

async function updateTask(taskId, updates) {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, updates);
}

async function deleteTask(taskId) {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
}

// MESSAGES
async function fetchMessages() {
    try {
        // Try with orderBy first
        const q = query(messagesCollection, orderBy('time', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.log('Fetching messages without order:', error.message);
        // Fallback: fetch without ordering and sort locally
        const snapshot = await getDocs(messagesCollection);
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return messages.sort((a, b) => new Date(a.time) - new Date(b.time));
    }
}

async function addMessage(message) {
    // Add a numeric timestamp for proper sorting
    message.timestamp = Date.now();
    const docRef = await addDoc(messagesCollection, message);
    return { id: docRef.id, ...message };
}

// ACTIVITIES
async function fetchActivities() {
    const snapshot = await getDocs(activitiesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addActivity(activity) {
    const docRef = await addDoc(activitiesCollection, activity);
    return { id: docRef.id, ...activity };
}

// Real-time listeners
function subscribeToTasks(callback) {
    return onSnapshot(tasksCollection, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(tasks);
    });
}

function subscribeToMessages(callback) {
    // Subscribe without orderBy to avoid index requirement, sort locally
    return onSnapshot(messagesCollection, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by timestamp (numeric) if available, otherwise by time string
        messages.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                return a.timestamp - b.timestamp;
            }
            return new Date(a.time.replace(' ', 'T')) - new Date(b.time.replace(' ', 'T'));
        });
        callback(messages);
    });
}

function subscribeToActivities(callback) {
    return onSnapshot(activitiesCollection, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(activities);
    });
}

// MENU
async function fetchMenu() {
    const q = query(collection(db, 'menu'), orderBy('category', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addMenuItem(item) {
    const docRef = await addDoc(collection(db, 'menu'), item);
    return { id: docRef.id, ...item };
}

async function updateMenuItem(id, updates) {
    const itemRef = doc(db, 'menu', id);
    await updateDoc(itemRef, updates);
}

async function deleteMenuItem(id) {
    const itemRef = doc(db, 'menu', id);
    await deleteDoc(itemRef);
}

async function batchDeleteMenuItems(ids) {
    const promises = ids.map(id => deleteMenuItem(id));
    await Promise.all(promises);
}

function subscribeToMenu(callback) {
    const q = query(collection(db, 'menu'), orderBy('category', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
}

// Reset all data - clears all collections
async function resetAllData() {
    try {
        // Delete all tasks
        const tasksSnapshot = await getDocs(tasksCollection);
        const taskDeletePromises = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(taskDeletePromises);

        // Delete all messages
        const messagesSnapshot = await getDocs(messagesCollection);
        const messageDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(messageDeletePromises);

        // Delete all activities
        const activitiesSnapshot = await getDocs(activitiesCollection);
        const activityDeletePromises = activitiesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(activityDeletePromises);

        console.log('✅ All data has been reset');
        return true;
    } catch (error) {
        console.error('Error resetting data:', error);
        return false;
    }
}

// Reset menu data - clears menu collection
async function resetMenu() {
    try {
        const menuSnapshot = await getDocs(collection(db, 'menu'));
        const deletePromises = menuSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log('✅ Menu has been reset');
        return true;
    } catch (error) {
        console.error('Error resetting menu:', error);
        return false;
    }
}

// Export for use in app.js
export {
    db,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    fetchMessages,
    addMessage,
    fetchActivities,
    addActivity,
    subscribeToTasks,
    subscribeToMessages,
    subscribeToActivities,
    fetchMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    batchDeleteMenuItems,
    subscribeToMenu,
    resetAllData,
    resetMenu
};
