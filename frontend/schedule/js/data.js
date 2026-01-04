// ===================================
// Data for DevSync Dashboard
// ===================================

// Local data arrays (will be synced with Firebase)
let tasks = [];
let messages = [];
let activities = [];

// Category labels
const categoryLabels = {
    design: "Design Update",
    content: "Content Change",
    feature: "New Feature",
    bug: "Bug Fix",
    maintenance: "Maintenance"
};

// User profiles
const users = {
    developer: {
        name: "Web Developer",
        avatar: "D",
        role: "Developer",
        location: "all"
    },
    medina: {
        name: "FishBurger Medina",
        avatar: "M",
        role: "Branch Manager",
        location: "all"
    },
    rooftop: {
        name: "FishBurger Rooftop",
        avatar: "R",
        role: "Branch Manager",
        location: "all"
    },
    casablanca: {
        name: "FishBurger Casablanca",
        avatar: "C",
        role: "Branch Manager",
        location: "all"
    }
};

// Current state
let currentRole = "developer";
let currentView = "dashboard";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Helper function to format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to get days until deadline
function getDaysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
}

// Generate unique ID (for local use before Firebase assigns ID)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
