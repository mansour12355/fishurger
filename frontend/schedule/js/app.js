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
        const hasReseeded = localStorage.getItem('menuReseeded_v10');

        if (!hasReseeded) {
            console.log('Running one-time menu cleanup and branch assignment...');
            // CLEAR ALL EXISTING DATA FIRST to avoid duplicates
            await resetMenu();

            // Reseed with branch assignments
            await seedMenu();

            localStorage.setItem('menuReseeded_v10', 'true');
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
    if (!indicator) return;

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
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');

    if (avatarEl) avatarEl.textContent = user.avatar;
    if (nameEl) nameEl.textContent = user.name;

    // Update new task button text based on role
    const newTaskBtns = document.querySelectorAll('#newTaskBtn, #newTaskBtn2');
    newTaskBtns.forEach(btn => {
        btn.innerHTML = currentRole !== 'developer' ? '<span>+</span> New Request' : '<span>+</span> Add Task';
    });

    // Display role indicator
    displayRoleIndicator();

    // Show/hide branch selector for developer
    const branchSelector = document.getElementById('branchSelectorWrapper');
    if (branchSelector) {
        branchSelector.style.display = role === 'developer' ? 'block' : 'none';
    }

    // Refresh views
    renderRecentTasks();
    renderTasksBoard();
    renderMessages();
    renderMenuCards();
}

// ===================================
// Branch Selection Logic
// ===================================
window.toggleBranchDropdown = function () {
    const dropdown = document.getElementById('branchDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('show');

    // Close when clicking outside
    const closeDropdown = (e) => {
        if (!e.target.closest('.branch-selector-wrapper')) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    };

    if (dropdown.classList.contains('show')) {
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }
};

window.filterMenuByBranch = function (branch) {
    selectedBranch = branch;

    // Update UI active state in dropdown
    document.querySelectorAll('.branch-option').forEach(btn => {
        if (btn.dataset.branch === branch) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update bag icon glow or text if needed (optional)
    const branchBtn = document.getElementById('branchBtn');
    if (branchBtn) {
        if (branch === 'all') {
            branchBtn.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.4)';
        } else {
            branchBtn.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.6)';
        }
    }

    renderMenuCards();

    // Close dropdown
    const dropdown = document.getElementById('branchDropdown');
    if (dropdown) dropdown.classList.remove('show');
};

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
        const mini = document.getElementById('menuMiniPrice').value;
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
            mini: mini ? parseFloat(mini) : null,
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
let selectedBranch = 'all';
let searchQuery = '';

window.handleMenuSearch = function (query) {
    searchQuery = query.toLowerCase().trim();
    renderMenuCards();
};

// ===================================
// Drag to Scroll Logic for Menu Filters
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelector('.menu-filters');
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.style.cursor = 'grabbing';
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; // scroll-fast
        slider.scrollLeft = scrollLeft - walk;
    });

    // Set initial cursor
    slider.style.cursor = 'grab';
});

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



// (Function moved to top)

function renderMenuCards() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    // Filter items based on user location, category, and search query
    const userLocation = users[currentRole].location;

    const filteredItems = menuItems.filter(item => {
        const itemLocation = item.location || 'all';
        // Location filter: user sees only their location items + 'all' items
        // Developer (location='all') sees everything
        const matchesLocation = userLocation === 'all' || itemLocation === userLocation || itemLocation === 'all';
        // Branch filter - if a branch is selected, show items for that branch + 'all' items
        const matchesBranch = selectedBranch === 'all' || itemLocation === selectedBranch || itemLocation === 'all';

        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const name = item.name || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery);
        return matchesLocation && matchesBranch && matchesCategory && matchesSearch;
    });

    if (filteredItems.length === 0) {
        let message = `No items found`;
        if (searchQuery) message = `No items found matching "${searchQuery}"`;
        if (selectedBranch !== 'all') message += ` in ${selectedBranch}`;
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
            <div class="menu-card-body" style="padding: 24px; display: flex; flex-direction: column; height: 100%; justify-content: space-between; background: #1e1e2d; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; transition: all 0.2s ease;">
                <div>
                    <!-- Title -->
                    <h3 class="menu-card-title view-mode" style="font-size: 1.1rem; font-weight: 700; color: #ffffff; margin-bottom: 8px;">${item.name}</h3>
                    
                    <!-- Editable Title Input -->
                    <input type="text" class="edit-mode form-input" id="edit-name-${item.id}" value="${item.name}" style="display:none; width: 100%; background: #13131f; border: 1px solid #2f2f3d; color: white; padding: 8px; border-radius: 6px; margin-bottom: 8px;">

                    <!-- Price -->
                    <div class="menu-card-price" style="margin-bottom: 12px;">
                        <span class="view-mode" style="font-size: 1.1rem; font-weight: 700; color: #818cf8;">
                            ${item.price} DH 
                            ${item.mini ? `<span style="font-size: 0.85em; color: #a5b4fc; font-weight: 500; margin-left: 4px;">(Mini: ${item.mini} DH)</span>` : ''}
                        </span>
                        <!-- Editable Price Input -->
                        <!-- Editable Price Input -->
                        <div class="edit-mode" style="display:none; gap: 8px; width: 100%;">
                            <div style="flex: 1">
                                <label style="display: block; font-size: 0.7rem; color: #818cf8; margin-bottom: 4px; font-weight: 600;">Price</label>
                                <input type="number" class="form-input" id="edit-price-${item.id}" value="${item.price}" placeholder="0" style="width: 100%; background: #1b1b29; border: 1px solid #2f2f3d; color: white; padding: 8px; border-radius: 6px; font-size: 0.9rem;">
                            </div>
                            <div style="flex: 1">
                                <label style="display: block; font-size: 0.7rem; color: #a5b4fc; margin-bottom: 4px; font-weight: 600;">Mini (Opt)</label>
                                <input type="number" class="form-input" id="edit-mini-${item.id}" value="${item.mini || ''}" placeholder="-" style="width: 100%; background: #1b1b29; border: 1px solid #2f2f3d; color: white; padding: 8px; border-radius: 6px; font-size: 0.9rem;">
                            </div>
                        </div>
                    </div>

                    <!-- Category Pill -->
                    <div class="menu-card-category" style="display: inline-block; background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px;">
                        ${item.category}
                    </div>
                </div>

                <!-- Footer: Availability & Edit -->
                <div class="menu-card-footer" style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 0.85rem; color: #6a6a7a; font-weight: 500;">Available</span>
                        
                        <!-- Toggle Logic -->
                        ${canEdit ? `

                            ${userLocation === 'all' ? `
                                <!-- Developer: See M, R, C controls -->
                                <div style="display: flex; gap: 12px;">
                                    <div class="switch-label" title="Medina">
                                        <span>M</span>
                                        <label class="switch">
                                            <input type="checkbox" ${item.availableMedina !== false ? 'checked' : ''} onchange="toggleLocationAvailability('${item.id}', 'medina', this.checked)">
                                            <span class="slider"></span>
                                            <span class="slider-knob"></span>
                                        </label>
                                    </div>
                                    <div class="switch-label" title="Rooftop">
                                        <span>R</span>
                                        <label class="switch">
                                            <input type="checkbox" ${item.availableRooftop !== false ? 'checked' : ''} onchange="toggleLocationAvailability('${item.id}', 'rooftop', this.checked)">
                                            <span class="slider"></span>
                                            <span class="slider-knob"></span>
                                        </label>
                                    </div>
                                    <div class="switch-label" title="Casablanca">
                                        <span>C</span>
                                        <label class="switch">
                                            <input type="checkbox" ${item.availableCasablanca !== false ? 'checked' : ''} onchange="toggleLocationAvailability('${item.id}', 'casablanca', this.checked)">
                                            <span class="slider"></span>
                                            <span class="slider-knob"></span>
                                        </label>
                                    </div>
                                </div>
                            ` : `
                                <!-- Branch Manager: See only their control -->
                                <label class="switch">
                                    <input type="checkbox" ${item[`available${userLocation.charAt(0).toUpperCase() + userLocation.slice(1)}`] !== false ? 'checked' : ''} onchange="toggleLocationAvailability('${item.id}', '${userLocation}', this.checked)">
                                    <span class="slider"></span>
                                    <span class="slider-knob"></span>
                                </label>
                            `}
                        ` : '<span style="color: #ef4444; font-size: 0.8rem;">Locked</span>'}
                    </div>

                    <!-- Actions -->
                    <div class="menu-card-actions" style="display: flex; align-items: center; gap: 8px;">
                        
                        <!-- Edit Button (Pencil) -->
                        <div class="action-btn edit-btn view-mode" style="color: #6a6a7a; cursor: pointer; transition: color 0.2s;" title="Edit">
                            <i data-lucide="pencil" style="width: 18px; height: 18px;"></i>
                        </div>

                        <!-- Save Button (Check) -->
                        <div class="action-btn save-btn edit-mode" style="display: none; color: #10b981; cursor: pointer; transition: transform 0.2s;" title="Save">
                            <i data-lucide="check" style="width: 20px; height: 20px;"></i>
                        </div>

                        <!-- Cancel Button (X) -->
                        <div class="action-btn cancel-btn edit-mode" style="display: none; color: #ef4444; cursor: pointer; transition: transform 0.2s;" title="Cancel">
                            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                        </div>

                    </div>
                </div>
            </div>
            `;

        // Add hover effect for the border
        card.addEventListener('mouseenter', () => {
            card.querySelector('.menu-card-body').style.borderColor = '#6366f1';
        });
        card.addEventListener('mouseleave', () => {
            card.querySelector('.menu-card-body').style.borderColor = 'rgba(255,255,255,0.05)';
        });

        // Initialize Lucide icons for this card
        setTimeout(() => {
            lucide.createIcons({
                root: card,
                nameAttr: 'data-lucide'
            });
        }, 0);



        const editBtn = card.querySelector('.edit-btn');
        const saveBtn = card.querySelector('.save-btn');
        const cancelBtn = card.querySelector('.cancel-btn');

        // Enter Edit Mode
        editBtn.addEventListener('click', () => {
            card.classList.add('editing');
            card.style.borderColor = '#6366f1';

            // Explicitly populate values
            const nameIn = card.querySelector('#edit-name-' + item.id);
            const priceIn = card.querySelector('#edit-price-' + item.id);
            const miniIn = card.querySelector('#edit-mini-' + item.id);

            nameIn.value = item.name;
            priceIn.value = item.price;
            miniIn.value = item.mini || '';

            // Toggle visibility
            card.querySelector('.menu-card-title').style.display = 'none';
            nameIn.style.display = 'block';

            card.querySelector('.menu-card-price .view-mode').style.display = 'none';
            card.querySelector('.menu-card-price .edit-mode').style.display = 'flex';

            // Show buttons
            editBtn.style.display = 'none';
            saveBtn.style.display = 'block';
            cancelBtn.style.display = 'block';

            // Focus Price
            priceIn.focus();
        });

        // Cancel Edit
        cancelBtn.addEventListener('click', () => {
            // Reset values
            card.querySelector('#edit-name-' + item.id).value = item.name;
            card.querySelector('#edit-price-' + item.id).value = item.price;
            card.querySelector('#edit-mini-' + item.id).value = item.mini || '';

            // Exit edit mode
            card.classList.remove('editing');
            card.style.borderColor = 'rgba(255,255,255,0.05)';

            // Hide inputs / Show View
            card.querySelector('.menu-card-title').style.display = 'block';
            card.querySelector('#edit-name-' + item.id).style.display = 'none';

            card.querySelector('.menu-card-price .view-mode').style.display = 'block';
            card.querySelector('.menu-card-price .edit-mode').style.display = 'none';

            // Reset buttons
            editBtn.style.display = 'block';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        });

        // Save Edit
        saveBtn.addEventListener('click', async () => {
            const nameInput = card.querySelector('#edit-name-' + item.id);
            const priceInput = card.querySelector('#edit-price-' + item.id);
            const miniInput = card.querySelector('#edit-mini-' + item.id);

            const newName = nameInput.value.trim();
            const newPrice = parseFloat(priceInput.value);
            const newMini = miniInput.value ? parseFloat(miniInput.value) : null;

            if (!newName || !newPrice) {
                alert('Name and Price are required');
                return;
            }

            // Update Item Data
            item.name = newName;
            item.price = newPrice;
            item.mini = newMini;

            // Update View
            card.querySelector('.menu-card-title').textContent = newName;
            card.querySelector('.menu-card-price .view-mode').innerHTML =
                `${newPrice} DH ${newMini ? `<span style="font-size: 0.85em; color: #a5b4fc; font-weight: 500; margin-left: 4px;">(Mini: ${newMini} DH)</span>` : ''}`;

            // Exit Edit Mode
            card.classList.remove('editing');
            card.style.borderColor = 'rgba(255,255,255,0.05)';

            // Hide inputs / Show View
            card.querySelector('.menu-card-title').style.display = 'block';
            nameInput.style.display = 'none';

            card.querySelector('.menu-card-price .view-mode').style.display = 'block';
            card.querySelector('.menu-card-price .edit-mode').style.display = 'none';

            // Reset buttons
            editBtn.style.display = 'block';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';

            // Persist to Firebase
            try {
                await updateMenuItem(item.id, { name: newName, price: newPrice, mini: newMini });

                // Activity
                await addActivity({
                    icon: '📝',
                    text: `<strong>${users[currentRole].name}</strong> updated item: ${newName}`,
                    time: 'Just now'
                });

            } catch (err) {
                console.error('Failed to update item:', err);
                alert('Failed to save changes. Please try again.');
            }
        });

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
    const miniInput = document.getElementById(`edit-mini-${id}`);

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const mini = miniInput.value ? parseFloat(miniInput.value) : null;

    if (!name || !price) return;

    const item = menuItems.find(i => i.id === id);
    const user = users[currentRole];
    // Permission check removed as per user request

    await updateMenuItem(id, { name, price, mini });

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

window.toggleLocationAvailability = async function (id, location, isAvailable) {
    const field = 'available' + location.charAt(0).toUpperCase() + location.slice(1);
    await updateMenuItem(id, { [field]: isAvailable });

    // Check local update for immediate feedback (optional, since realtime listener will handle it)
    const item = menuItems.find(i => i.id === id);
    if (item) {
        item[field] = isAvailable;
    }
}

async function seedMenu() {
    const seedItems = [
        // BURGERS
        { name: "Crispy Fish Burger", price: 70, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1549421263-606aea2824ef?auto=format&fit=crop&q=60&w=500", available: true, mini: 55, desc: "Crispy fish filet, lettuce, coleslaw, chipotle, salsa verde, tartar & cornichons", note: "Best Seller - Includes 1 side for free" },
        { name: "Double Crispy Fish Burger", price: 110, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=60&w=500", available: true, desc: "2 crispy fish filets, lettuce, coleslaw, chipotle, salsa verde, tartar & cornichons", note: "Includes 1 side for free" },
        { name: "Sardine Burger", price: 60, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=60&w=500", available: true, mini: 45, desc: "2 grilled hashed sardine patties, cheese, lettuce, tomatoes & caramelized onions", note: "Signature - Includes 1 side for free" },
        { name: "Tofu Burger", price: 75, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=60&w=500", available: true, mini: 60, desc: "Crispy tofu, cheese, lettuce, tomatoes, salsa verde and chipotle sauce", veg: true, note: "Vegetarian - Includes 1 side for free" },
        { name: "Calamari Burger", price: 75, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&q=60&w=500", available: true, mini: 60, desc: "Crispy calamari rings, lettuce, cornichons & tartar", note: "Includes 1 side for free" },
        { name: "Octopus Burger", price: 75, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1550950158-d0d960dff51b?auto=format&fit=crop&q=60&w=500", available: true, mini: 60, desc: "Crispy chopped octopus legs, lettuce, tomatoes, cornichons & salsa verde", note: "Includes 1 side for free" },
        { name: "Burger of the Month", price: 70, category: "burgers", location: "all", image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&q=60&w=500", available: true, mini: 55, desc: "Monthly burger inspired by a local artist. Ask your waiter for more details", note: "Limited Edition - Includes 1 side for free" },

        // SIDES
        { name: "Potato Fries", price: 20, category: "sides", location: "all", image: "https://images.unsplash.com/photo-1630384060421-a43fe6c2243d?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Onion Rings", price: 25, category: "sides", location: "all", image: "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Guacamole", price: 20, category: "sides", location: "all", image: "https://images.unsplash.com/photo-1604543666205-067b84d2847f?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Coleslaw", price: 20, category: "sides", location: "all", image: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },

        // TAPAS
        { name: "Summer Salad", price: 35, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=60&w=500", available: true, desc: "Avocados, lettuce, tomatoes, onions, cucumbers & vinaigrette" },
        { name: "Fancy Sardines", price: 20, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1599321955726-90471f645676?auto=format&fit=crop&q=60&w=500", available: true, desc: "3 crispy fresh sardines, stuffed with sharmoula" },
        { name: "Seafood Basket", price: 60, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=60&w=500", available: true, desc: "Fried seafood mix & potato chips" },
        { name: "Nachos", price: 45, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=60&w=500", available: true, desc: "Golden tortilla chips, guacamole, pico de gallo, chipotle sauce and salsa verde" },
        { name: "Msemmen Fish Tacos", price: 35, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1599321955726-90471f645676?auto=format&fit=crop&q=60&w=500", available: true, desc: "2 Moroccan tortilla, crispy white fish, veggies, salsa verde and chipotle sauce" },
        { name: "Sardine Croquettes", price: 30, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1563865436874-9aef32095fad?auto=format&fit=crop&q=60&w=500", available: true, desc: "3 crispy sardine balls, cheese stuffed" },
        { name: "Calamari Rings", price: 40, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=60&w=500", available: true, desc: "5 crispy rings & tartar sauce" },
        { name: "Fish Nuggets", price: 30, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=60&w=500", available: true, desc: "3 crispy fish nuggets & tartar sauce" },
        { name: "Mozzarella Sticks", price: 30, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1531749387985-dab4176cf360?auto=format&fit=crop&q=60&w=500", available: true, desc: "5 sticks & marinara sauce" },
        { name: "Fried Octopus", price: 40, category: "tapas", location: "all", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=60&w=500", available: true, desc: "Crispy octopus slices" },

        // GLOBE
        { name: "Fish & Chips", price: 70, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1579208030886-b1c9d506dab8?auto=format&fit=crop&q=60&w=500", available: true, desc: "Crispy fish fillets, potato chips, coleslaw & tartar" },
        { name: "Seafood Burrito", price: 70, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1628191010210-a59de33e5941?auto=format&fit=crop&q=60&w=500", available: true, desc: "Crispy white fish, guacamole, rice, lettuce, coleslaw, salsa verde & chipotle sauce" },
        { name: "Po' Boy Sandwich", price: 50, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&q=60&w=500", available: true, desc: "Crispy white fish, lettuce, tomatoes & tartar" },
        { name: "Bocadillo de Calamares", price: 50, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=60&w=500", available: true, desc: "Crispy calamari rings, lettuce, tomatoes, onions & tartar" },
        { name: "Octopus Sandwich", price: 60, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=60&w=500", available: true, desc: "Marinated octopus, marinara, pico de gallo & chipotle sauce" },
        { name: "Calamari Bruschetta", price: 45, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1572695157369-0e5a44a1b020?auto=format&fit=crop&q=60&w=500", available: true, desc: "Sourdough, crispy calamari rings, marinara & cilantro" },
        { name: "Avocado Toast", price: 45, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1588137372308-15f75323a39e?auto=format&fit=crop&q=60&w=500", available: true, desc: "Sourdough, avocados, fresh herbs & salsa verde" },
        { name: "Fish Fillet Toast", price: 60, category: "globe", location: "all", image: "https://images.unsplash.com/photo-1525936737525-45d4715201c1?auto=format&fit=crop&q=60&w=500", available: true, desc: "Sourdough, crispy fish fillet, tartar, cornichons & chipotle sauce" },

        // DESSERTS
        { name: "Cinnabun Crumble Topped Icecream", price: 35, category: "desserts", location: "all", image: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Ice Cream Cookie-Burger", price: 40, category: "desserts", location: "all", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "2 Chocolate Chip Cookies", price: 20, category: "desserts", location: "all", image: "https://images.unsplash.com/photo-1499636136210-6f4ee9155bb9?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },

        // DRINKS
        { name: "Soda", price: 15, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Still Water 33cl/1.5l", price: 10, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&q=60&w=500", available: true, desc: "33cl (10dh) / 1.5l (30dh)" },
        { name: "Sparkling Water 33cl", price: 15, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1613205799981-d2ab52538cb3?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Ginger Mint Lemonade", price: 20, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Espresso", price: 20, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1561882468-9110e03e0f7e?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Americano", price: 20, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1552599607-4560d2688aff?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Iced Coffee", price: 25, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=60&w=500", available: true, desc: "" },
        { name: "Iced Tea", price: 20, category: "drinks", location: "all", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=60&w=500", available: true, desc: "" }
    ];

    console.log('Seeding menu with branch assignments...');

    // Upload each item
    for (const item of seedItems) {
        // Initial state matches UI expectation
        item.updatedBy = 'system';
        item.updatedAt = new Date().toISOString();

        await addMenuItem(item);
    }

    console.log(`✅ Menu seeded (${seedItems.length} items)`);
}

