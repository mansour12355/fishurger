// ===================================
// DevSync Dashboard - Main Application
// With Firebase Integration
// ===================================

// Import Firebase functions
import {
    fetchTasks,
    addTask,
    updateTask,
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
    resetMenu
} from './firebase-config.js';

// App initialization
document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    if (!sessionStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Set current role from session storage
    const savedRole = sessionStorage.getItem('userRole');
    if (savedRole) {
        currentRole = savedRole;
    }

    initializeApp();
});

async function initializeApp() {
    // Set default deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDeadline').valueAsDate = tomorrow;

    // Initialize event listeners
    initRoleSwitcher();
    initNavigation();
    initModals();
    initTaskForm();
    initCalendar();
    initMessages();
    initFilters();

    // Load data from Firebase
    await loadDataFromFirebase();

    // Set up real-time listeners
    setupRealtimeListeners();

    // Update UI based on logged-in role
    switchRole(currentRole);
}

// Global menu items
let menuItems = [];

// Load initial data from Firebase
async function loadDataFromFirebase() {
    try {
        tasks = await fetchTasks();
        messages = await fetchMessages();
        activities = await fetchActivities();
        menuItems = await fetchMenu();

        // One-time deduplication and reseed check
        const hasReseeded = localStorage.getItem('menuReseeded_v4');

        if (!hasReseeded) {
            console.log('Running one-time menu cleanup and branch assignment...');
            await deduplicateMenu();

            // Reseed with branch assignments
            await seedMenu();

            localStorage.setItem('menuReseeded_v4', 'true');
            menuItems = await fetchMenu();
        } else if (menuItems.length === 0) {
            await seedMenu();
            menuItems = await fetchMenu();
        }

        // Render all views
        updateStats();
        renderRecentTasks();
        renderActivityFeed();
        renderDeadlines();
        renderTasksBoard();
        renderMessages();
        renderMenuCards();
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
    }
}

async function deduplicateMenu() {
    console.log('Checking for duplicate menu items...');
    const currentItems = await fetchMenu();
    const seenNames = new Set();
    const duplicateIds = [];

    currentItems.forEach(item => {
        if (seenNames.has(item.name)) {
            duplicateIds.push(item.id);
        } else {
            seenNames.add(item.name);
        }
    });

    if (duplicateIds.length > 0) {
        console.log(`Deleting ${duplicateIds.length} duplicate items...`);
        await batchDeleteMenuItems(duplicateIds);
        console.log('✅ Deduplication complete');
    } else {
        console.log('No duplicates found');
    }
}

// Set up real-time listeners for live updates
function setupRealtimeListeners() {
    // Listen for task changes
    subscribeToTasks((updatedTasks) => {
        tasks = updatedTasks;
        updateStats();
        renderRecentTasks();
        renderDeadlines();
        renderTasksBoard();
        renderCalendar();
    });

    // Listen for message changes
    subscribeToMessages((updatedMessages) => {
        const hadMessages = messages.length;
        messages = updatedMessages;
        renderMessages();

        // Show notification badge if new message from other user
        if (updatedMessages.length > hadMessages) {
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            if (lastMsg && lastMsg.sender !== currentRole) {
                showMessageNotification();
            }
        }
    });

    // Listen for activity changes
    subscribeToActivities((updatedActivities) => {
        activities = updatedActivities;
        renderActivityFeed();
    });

    // Listen for menu changes
    subscribeToMenu((updatedItems) => {
        menuItems = updatedItems;
        renderMenuCards();
    });
}

// Show notification for new messages
function showMessageNotification() {
    const badge = document.getElementById('messageBadge');
    let count = parseInt(badge.textContent) || 0;
    count++;
    badge.textContent = count;
    badge.style.display = 'block';
}

// Logout function
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userRole');
    window.location.href = 'login.html';
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// Close sidebar when clicking a nav item (mobile)
function closeSidebarOnNav() {
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

// Make toggleSidebar available globally
window.toggleSidebar = toggleSidebar;

// ===================================
// Role Display (No Switching)
// ===================================
function initRoleSwitcher() {
    // Role switching is disabled - role is set at login
    // Just display the current role indicator
    displayRoleIndicator();
}

function displayRoleIndicator() {
    const indicator = document.getElementById('roleIndicator');
    const user = users[currentRole];
    const icon = currentRole !== 'developer' ? 'briefcase' : 'code-2';

    indicator.innerHTML = `
        <div class="role-display">
            <span class="role-icon"><i data-lucide="${icon}"></i></span>
            <span class="role-name">${user.role}</span>
        </div>
    `;
    lucide.createIcons();
}

function switchRole(role) {
    // Role is fixed at login - just update UI for current role
    currentRole = role;

    // Update user profile display
    const user = users[role];
    document.getElementById('userAvatar').textContent = user.avatar;
    document.getElementById('userName').textContent = user.name;

    // Update new task button text based on role
    const newTaskBtns = document.querySelectorAll('#newTaskBtn, #newTaskBtn2');
    newTaskBtns.forEach(btn => {
        btn.innerHTML = currentRole !== 'developer' ? '<span>+</span> New Request' : '<span>+</span> Add Task';
    });

    // Display role indicator
    displayRoleIndicator();

    // Refresh views
    renderRecentTasks();
    renderTasksBoard();
    renderMessages();
}

// ===================================
// Navigation
// ===================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const view = this.dataset.view;
            switchView(view);
        });
    });

    // View all links
    document.querySelectorAll('.link[data-view]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            switchView(this.dataset.view);
        });
    });
}

function switchView(view) {
    currentView = view;

    // Close sidebar on mobile when navigating
    closeSidebarOnNav();

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(view + 'View').classList.add('active');

    // Refresh calendar if switching to calendar view
    if (view === 'calendar') {
        renderCalendar();
    }

    // Clear message badge when viewing messages and scroll to latest
    if (view === 'messages') {
        const badge = document.getElementById('messageBadge');
        badge.textContent = '0';
        badge.style.display = 'none';

        // Scroll to the latest message
        setTimeout(() => {
            const messagesList = document.getElementById('messagesList');
            if (messagesList) {
                messagesList.scrollTop = messagesList.scrollHeight;
            }
        }, 100);
    }
}

// ===================================
// Statistics
// ===================================
function updateStats() {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statProgress').textContent = inProgress;
    document.getElementById('statReview').textContent = review;
    document.getElementById('statCompleted').textContent = completed;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('progressCount').textContent = inProgress;
}

// ===================================
// Recent Tasks
// ===================================
function renderRecentTasks() {
    const container = document.getElementById('recentTasksList');
    const recentTasks = tasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    container.innerHTML = recentTasks.map(task => `
        <div class="task-item" onclick="openTaskDetail('${task.id}')">
            <div class="task-priority ${task.priority}"></div>
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span><i data-lucide="folder"></i> ${categoryLabels[task.category]}</span>
                    <span><i data-lucide="calendar"></i> ${formatDate(task.deadline)}</span>
                </div>
            </div>
            <span class="task-status ${task.status}">${formatStatus(task.status)}</span>
        </div>
    `).join('');
    lucide.createIcons();
}

function formatStatus(status) {
    const labels = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'review': 'Review',
        'completed': 'Done'
    };
    return labels[status] || status;
}

// ===================================
// Activity Feed
// ===================================
function renderActivityFeed() {
    const container = document.getElementById('activityList');

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${getActivityIcon(activity.icon)}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Helper function to convert emoji icons to Lucide icons
function getActivityIcon(emoji) {
    const iconMap = {
        '✅': '<i data-lucide="check-circle-2"></i>',
        '💬': '<i data-lucide="message-circle"></i>',
        '🔄': '<i data-lucide="refresh-cw"></i>',
        '📝': '<i data-lucide="file-text"></i>',
        '⚡': '<i data-lucide="zap"></i>',
        '📅': '<i data-lucide="calendar"></i>',
        '📁': '<i data-lucide="folder"></i>'
    };
    return iconMap[emoji] || emoji;
}

// ===================================
// Deadlines
// ===================================
function renderDeadlines() {
    const container = document.getElementById('deadlineList');
    const upcoming = tasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 4);

    container.innerHTML = upcoming.map(task => {
        const date = new Date(task.deadline);
        return `
            <div class="deadline-item" onclick="openTaskDetail('${task.id}')">
                <div class="deadline-date">
                    <span class="deadline-day">${date.getDate()}</span>
                    <span class="deadline-month">${date.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="deadline-info">
                    <div class="deadline-title">${task.title}</div>
                    <div class="deadline-category">${categoryLabels[task.category]} • ${getDaysUntil(task.deadline)}</div>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

// ===================================
// Tasks Board (Kanban)
// ===================================
function renderTasksBoard() {
    const container = document.getElementById('tasksBoard');
    const columns = [
        { id: 'pending', title: 'Pending', dot: 'pending' },
        { id: 'in-progress', title: 'In Progress', dot: 'in-progress' },
        { id: 'review', title: 'In Review', dot: 'review' },
        { id: 'completed', title: 'Completed', dot: 'completed' }
    ];

    // Get filter values
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;

    container.innerHTML = columns.map(col => {
        let columnTasks = tasks.filter(t => t.status === col.id);

        // Apply priority filter
        if (priorityFilter !== 'all') {
            columnTasks = columnTasks.filter(t => t.priority === priorityFilter);
        }

        // If status filter is set, only show that column
        if (statusFilter !== 'all' && statusFilter !== col.id) {
            return '';
        }

        return `
            <div class="task-column">
                <div class="column-header">
                    <div class="column-dot ${col.dot}"></div>
                    <span class="column-title">${col.title}</span>
                    <span class="column-count">${columnTasks.length}</span>
                </div>
                <div class="column-tasks">
                    ${columnTasks.map(task => `
                        <div class="board-task" onclick="openTaskDetail('${task.id}')">
                            <div class="board-task-header">
                                <div class="board-task-priority ${task.priority}"></div>
                                <div class="board-task-title">${task.title}</div>
                            </div>
                            <div class="board-task-category">${categoryLabels[task.category]}</div>
                            <div class="board-task-footer">
                                <span><i data-lucide="calendar"></i> ${formatDate(task.deadline)}</span>
                                <span><i data-lucide="message-circle"></i> ${task.comments ? task.comments.length : 0}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

function initFilters() {
    document.getElementById('statusFilter').addEventListener('change', renderTasksBoard);
    document.getElementById('priorityFilter').addEventListener('change', renderTasksBoard);
}

// ===================================
// Calendar
// ===================================
function initCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    document.getElementById('currentMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let html = dayNames.map(day => `<div class="calendar-header">${day}</div>`).join('');

    // Previous month days
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month"><span class="day-number">${prevLastDay - i}</span></div>`;
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.deadline === dateStr);
        const isToday = dateStr === todayStr;

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <span class="day-number">${day}</span>
                <div class="day-tasks">
                    ${dayTasks.slice(0, 3).map(t => `
                        <div class="day-task ${t.priority}" onclick="openTaskDetail('${t.id}')">${t.title}</div>
                    `).join('')}
                    ${dayTasks.length > 3 ? `<div class="day-task">+${dayTasks.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }

    // Next month days
    const remainingDays = 42 - (startingDay + totalDays);
    for (let i = 1; i <= remainingDays; i++) {
        html += `<div class="calendar-day other-month"><span class="day-number">${i}</span></div>`;
    }

    container.innerHTML = html;
}

// ===================================
// Messages
// ===================================
function initMessages() {
    const sendBtn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('messageInput');

    sendBtn.addEventListener('click', sendMessageHandler);
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessageHandler();
    });
}

function renderMessages() {
    const container = document.getElementById('messagesList');

    container.innerHTML = messages.map(msg => {
        const isSent = msg.sender === currentRole;
        const user = users[msg.sender];

        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-avatar">${user.avatar}</div>
                <div class="message-content">
                    <div class="message-sender">${user.name}</div>
                    <div class="message-text">${msg.text}</div>
                    <div class="message-time">${formatTime(msg.time)}</div>
                </div>
            </div>
        `;
    }).join('');

    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

async function sendMessageHandler() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    const now = new Date();
    const timeStr = now.toISOString().slice(0, 16).replace('T', ' ');

    const newMessage = {
        sender: currentRole,
        text: text,
        time: timeStr
    };

    // Add to Firebase
    await addMessage(newMessage);

    input.value = '';
}

function formatTime(timeStr) {
    const date = new Date(timeStr.replace(' ', 'T'));
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// ===================================
// Modals
// ===================================
function initModals() {
    const taskModal = document.getElementById('taskModal');
    const taskDetailModal = document.getElementById('taskDetailModal');

    // Open new task modal
    document.getElementById('newTaskBtn').addEventListener('click', () => openModal(taskModal));
    document.getElementById('newTaskBtn2').addEventListener('click', () => openModal(taskModal));

    // Close modals
    document.getElementById('closeModal').addEventListener('click', () => closeModal(taskModal));
    document.getElementById('cancelTask').addEventListener('click', () => closeModal(taskModal));
    document.getElementById('closeDetailModal').addEventListener('click', () => closeModal(taskDetailModal));

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function () {
            closeModal(this.closest('.modal'));
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => closeModal(modal));
        }
    });
}

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===================================
// Task Form
// ===================================
function initTaskForm() {
    const form = document.getElementById('taskForm');

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        createTaskHandler();
    });
}

async function createTaskHandler() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const deadline = document.getElementById('taskDeadline').value;

    if (!title || !description || !deadline) return;

    const newTask = {
        title,
        description,
        category,
        priority,
        status: 'pending',
        deadline,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentRole,
        comments: []
    };

    // Add to Firebase
    await addTask(newTask);

    // Add activity
    const activityData = {
        icon: '📝',
        text: `<strong>${users[currentRole].name}</strong> created new task: ${title}`,
        time: 'Just now'
    };
    await addActivity(activityData);

    // Reset form and close modal
    document.getElementById('taskForm').reset();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDeadline').valueAsDate = tomorrow;

    closeModal(document.getElementById('taskModal'));
}

// ===================================
// Task Detail
// ===================================
window.openTaskDetail = function (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('taskDetailModal');
    const content = document.getElementById('taskDetailContent');

    document.getElementById('detailTitle').textContent = task.title;

    content.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">Description</div>
            <div class="detail-value">${task.description}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-badges">
                <span class="detail-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                <span class="detail-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-primary);">
                    ${categoryLabels[task.category]}
                </span>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Status</div>
            <select class="status-select" onchange="updateTaskStatusHandler('${task.id}', this.value)" ${currentRole !== 'developer' && task.status !== 'review' ? 'disabled' : ''}>
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="review" ${task.status === 'review' ? 'selected' : ''}>In Review</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Deadline</div>
            <div class="detail-value"><i data-lucide="calendar" class="inline-icon"></i> ${formatDate(task.deadline)} (${getDaysUntil(task.deadline)})</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Created</div>
            <div class="detail-value">By ${users[task.createdBy].name} on ${formatDate(task.createdAt)}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Comments (${task.comments ? task.comments.length : 0})</div>
            <div class="comments-list">
                ${task.comments ? task.comments.map(c => `
                    <div class="comment">
                        <div class="comment-avatar">${c.author[0]}</div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${c.author}</span>
                                <span class="comment-time">${formatTime(c.time)}</span>
                            </div>
                            <div class="comment-text">${c.text}</div>
                        </div>
                    </div>
                `).join('') : '<p style="color: var(--text-muted);">No comments yet</p>'}
            </div>
            <div class="comment-form">
                <input type="text" class="comment-input" id="commentInput" placeholder="Add a comment...">
                <button class="btn btn-primary" onclick="addCommentHandler('${task.id}')">Send</button>
            </div>
        </div>
    `;

    openModal(modal);
    lucide.createIcons();
}

window.updateTaskStatusHandler = async function (taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Update in Firebase
    await updateTask(taskId, { status: newStatus });

    // Add activity
    const activityData = {
        icon: newStatus === 'completed' ? '✅' : '🔄',
        text: `<strong>${users[currentRole].name}</strong> moved task to ${formatStatus(newStatus)}: ${task.title}`,
        time: 'Just now'
    };
    await addActivity(activityData);
}

window.addCommentHandler = async function (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toISOString().slice(0, 16).replace('T', ' ');

    const newComment = {
        author: users[currentRole].name,
        text,
        time: timeStr
    };

    // Update task comments in Firebase
    const updatedComments = [...(task.comments || []), newComment];
    await updateTask(taskId, { comments: updatedComments });

    // Add activity
    const activityData = {
        icon: '💬',
        text: `<strong>${users[currentRole].name}</strong> commented on: ${task.title}`,
        time: 'Just now'
    };
    await addActivity(activityData);

    // Refresh task detail
    input.value = '';
    openTaskDetail(taskId);
}

// Make logout available globally
window.logout = logout;

// ===================================
// Menu Management
// ===================================

async function initMenuForm() {
    const form = document.getElementById('menuItemForm');
    if (!form) return;

    // Show location selection for everyone
    const locationGroup = document.getElementById('locationGroup');
    if (locationGroup) {
        locationGroup.style.display = 'block';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('menuName').value.trim();
        const price = document.getElementById('menuPrice').value;
        const category = document.getElementById('menuCategory').value;
        const locationInput = document.getElementById('menuLocation').value;
        const image = document.getElementById('menuImage').value.trim();
        const available = document.getElementById('menuAvailable').checked;

        if (!name || !price) return;

        // Enforce location: if developer, use input; if others, use their fixed location
        const user = users[currentRole];
        const assignedLocation = user.location === 'all' ? locationInput : user.location;

        const newItem = {
            name,
            price: parseFloat(price),
            category,
            location: assignedLocation,
            image: image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fHww',
            available,
            updatedBy: currentRole,
            updatedAt: new Date().toISOString()
        };

        await addMenuItem(newItem);

        // Add activity
        await addActivity({
            icon: '🍔',
            text: `<strong>${user.name}</strong> added menu item: ${name} (${assignedLocation})`,
            time: 'Just now'
        });

        // Reset and close
        form.reset();
        document.getElementById('menuAvailable').checked = true;
        closeModal(document.getElementById('menuItemModal'));
    });
}

// Call this in initializeApp
// (Since we can't easily edit initializeApp again without context loss, we'll append a call here)
document.addEventListener('DOMContentLoaded', () => {
    initMenuForm();
});


// Menu Filtering
let selectedCategory = 'all';
let searchQuery = '';

window.handleMenuSearch = function (query) {
    searchQuery = query.toLowerCase().trim();
    renderMenuCards();
};

window.filterMenuByCategory = function (category) {
    selectedCategory = category;

    // Update UI active state
    document.querySelectorAll('.menu-filter').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderMenuCards();
};

function renderMenuCards() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    // Filter items based on selected category AND search query
    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    if (filteredItems.length === 0) {
        let message = `No items found`;
        if (searchQuery) message = `No items found matching "${searchQuery}"`;
        if (selectedCategory !== 'all') message += ` in ${selectedCategory}`;

        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">${message}.</div>`;
        return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.id = `card-${item.id}`;

        const itemLocation = item.location || 'all';
        const canEdit = true; // All users can edit everything now

        card.innerHTML = `
            <div class="menu-card-body">
                <div class="menu-card-header">
                    <h3 class="menu-card-title view-mode">${item.name}</h3>
                    <input type="text" class="edit-mode form-input" id="edit-name-${item.id}" value="${item.name}" style="display:none; margin-bottom: 8px;">
                    <div class="menu-card-price">
                        <span class="view-mode">${item.price} MAD</span>
                        <input type="number" class="edit-mode form-input" id="edit-price-${item.id}" value="${item.price}" style="display:none; width: 80px;">
                    </div>
                </div>
                <div class="menu-card-category">${item.category} ${itemLocation !== 'all' ? `<span class="location-badge">(${itemLocation})</span>` : ''}</div>
                
                <div class="menu-card-footer">
                    ${canEdit ? `
                        <label class="switch" title="Toggle Availability">
                            <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleMenuAvailability('${item.id}', this.checked)">
                            <span class="slider round"></span>
                        </label>
                        
                        <div class="actions">
                            <button class="btn-icon view-mode" onclick="editMenuItem('${item.id}')" title="Edit">
                                <i data-lucide="pencil"></i>
                            </button>
                            <div class="edit-mode" style="display: none; gap: 8px;">
                                <button class="btn-icon text-success" onclick="saveMenuItem('${item.id}')" title="Save">
                                    <i data-lucide="check"></i>
                                </button>
                                <button class="btn-icon text-danger" onclick="cancelEdit('${item.id}')" title="Cancel">
                                    <i data-lucide="x"></i>
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div style="font-size: 0.75rem; color: var(--text-muted); opacity: 0.7;">View Only</div>
                    `}
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    // Clear and append all at once
    grid.innerHTML = '';
    grid.appendChild(fragment);

    // Initialize icons only for the menu grid
    requestAnimationFrame(() => {
        lucide.createIcons({ nodes: grid.querySelectorAll('[data-lucide]') });
    });
}

// Make functions global
window.editMenuItem = function (id) {
    const card = document.getElementById(`card-${id}`);
    card.classList.add('editing');
    card.querySelectorAll('.view-mode').forEach(el => el.style.display = 'none');
    card.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'block');
    // Flex fix for action buttons
    card.querySelector('div.edit-mode').style.display = 'flex';
}

window.cancelEdit = function (id) {
    const card = document.getElementById(`card-${id}`);
    card.classList.remove('editing');
    card.querySelectorAll('.view-mode').forEach(el => el.style.display = 'block'); // restore block/flex
    card.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'none');
    card.querySelector('.menu-card-title').style.display = 'block'; // ensure title is block
    renderMenuCards(); // Easier to re-render to reset values
}

window.saveMenuItem = async function (id) {
    const nameInput = document.getElementById(`edit-name-${id}`);
    const priceInput = document.getElementById(`edit-price-${id}`);

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!name || !price) return;

    const item = menuItems.find(i => i.id === id);
    const user = users[currentRole];
    // Permission check removed as per user request

    await updateMenuItem(id, { name, price });

    // Add activity
    await addActivity({
        icon: '📝',
        text: `<strong>${users[currentRole].name}</strong> updated item: ${name}`,
        time: 'Just now'
    });

    // UI update handled by realtime listener, but we can force exit edit mode
    const card = document.getElementById(`card-${id}`);
    card.classList.remove('editing');
}

window.toggleMenuAvailability = async function (id, available) {
    const item = menuItems.find(i => i.id === id);
    const user = users[currentRole];
    // Permission check removed as per user request

    await updateMenuItem(id, { available });
}

async function seedMenu() {
    const seedItems = [
        // BURGERS -> MEDINA
        { name: "Crispy Fish Burger", price: 70, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1549421263-606aea2824ef?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Double Crispy Fish Burger", price: 110, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Sardine Burger", price: 60, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Tofu Burger", price: 75, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Calamari Burger", price: 75, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Octopus Burger", price: 75, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1550950158-d0d960dff51b?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Burger of the Month", price: 70, category: "burgers", location: "medina", image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },

        // SIDES & STARTERS -> ROOFTOP
        { name: "Potato Fries", price: 20, category: "sides", location: "rooftop", image: "https://images.unsplash.com/photo-1630384060421-a43fe6c2243d?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Onion Rings", price: 25, category: "sides", location: "rooftop", image: "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Summer Salad", price: 35, category: "starters", location: "rooftop", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Nachos", price: 45, category: "starters", location: "rooftop", image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },

        // SEAFOOD & DRINKS -> CASABLANCA
        { name: "Fish & Chips", price: 70, category: "seafood", location: "casablanca", image: "https://images.unsplash.com/photo-1579208030886-b1c9d506dab8?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Octopus Sandwich", price: 60, category: "seafood", location: "casablanca", image: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Soda", price: 15, category: "drinks", location: "casablanca", image: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() },
        { name: "Iced Coffee", price: 25, category: "drinks", location: "casablanca", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=60&w=500", available: true, updatedBy: "system", updatedAt: new Date().toISOString() }
    ];

    console.log('Seeding menu with branch assignments...');

    // For this demonstration, we'll clear and re-seed to ensure correct location tags
    const currentItems = await fetchMenu();
    if (currentItems.length > 0) {
        await batchDeleteMenuItems(currentItems.map(i => i.id));
    }

    for (const item of seedItems) {
        await addMenuItem(item);
    }

    // Refresh data
    menuItems = await fetchMenu();
    renderMenuCards();
}

