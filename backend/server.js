const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

// Helper function to read JSON file
async function readJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}

// Helper function to write JSON file
async function writeJSONFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Helper function to update analytics
async function updateAnalytics(order) {
    const analytics = await readJSONFile(ANALYTICS_FILE);
    if (!analytics) return;

    // Update total orders and revenue
    analytics.totalOrders += 1;
    analytics.totalRevenue += order.total;

    // Update orders by location
    if (order.location) {
        analytics.ordersByLocation[order.location] = (analytics.ordersByLocation[order.location] || 0) + 1;
    }

    // Update popular items
    order.items.forEach(item => {
        if (!analytics.popularItems[item.name]) {
            analytics.popularItems[item.name] = {
                count: 0,
                totalRevenue: 0
            };
        }
        analytics.popularItems[item.name].count += 1;
        analytics.popularItems[item.name].totalRevenue += item.price;
    });

    // Update orders by day
    const date = new Date(order.timestamp).toISOString().split('T')[0];
    analytics.ordersByDay[date] = (analytics.ordersByDay[date] || 0) + 1;

    await writeJSONFile(ANALYTICS_FILE, analytics);
}

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Fish Burger Backend is running!' });
});

// ==================== ORDERS ====================

// Create new order
app.post('/api/orders', async (req, res) => {
    try {
        const { items, total, customer, location } = req.body;

        // Validate required fields
        if (!items || !total || !customer) {
            return res.status(400).json({
                error: 'Missing required fields: items, total, customer'
            });
        }

        // Read existing orders
        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        // Create new order
        const newOrder = {
            id: uuidv4(),
            items,
            total,
            customer,
            location: location || 'unknown',
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        // Add to orders array
        data.orders.push(newOrder);

        // Save to file
        const saved = await writeJSONFile(ORDERS_FILE, data);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to save order' });
        }

        // Update analytics
        await updateAnalytics(newOrder);

        res.status(201).json({
            success: true,
            order: newOrder,
            message: 'Order created successfully!'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all orders (with optional location filter)
app.get('/api/orders', async (req, res) => {
    try {
        const { location, status, limit } = req.query;

        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        let orders = data.orders;

        // Filter by location
        if (location) {
            orders = orders.filter(order => order.location === location);
        }

        // Filter by status
        if (status) {
            orders = orders.filter(order => order.status === status);
        }

        // Limit results
        if (limit) {
            orders = orders.slice(-parseInt(limit));
        }

        // Sort by timestamp (newest first)
        orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        const order = data.orders.find(o => o.id === id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        const orderIndex = data.orders.findIndex(o => o.id === id);

        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update status
        data.orders[orderIndex].status = status;
        data.orders[orderIndex].updatedAt = new Date().toISOString();

        const saved = await writeJSONFile(ORDERS_FILE, data);
        if (!saved) {
            return res.status(500).json({ error: 'Failed to update order' });
        }

        res.json({
            success: true,
            order: data.orders[orderIndex],
            message: 'Order status updated successfully!'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== DASHBOARD ROUTES ====================

// Get orders for kitchen dashboard (pending and preparing)
app.get('/api/dashboard/kitchen', async (req, res) => {
    try {
        const { location } = req.query;

        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        let orders = data.orders.filter(order =>
            order.status === 'pending' || order.status === 'preparing'
        );

        // Filter by location if specified
        if (location) {
            orders = orders.filter(order => order.location === location);
        }

        // Sort by timestamp (oldest first for kitchen)
        orders.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Error getting kitchen orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get orders for delivery dashboard (ready and out-for-delivery)
app.get('/api/dashboard/delivery', async (req, res) => {
    try {
        const { location } = req.query;

        const data = await readJSONFile(ORDERS_FILE);
        if (!data) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        let orders = data.orders.filter(order =>
            order.status === 'ready' || order.status === 'out-for-delivery'
        );

        // Filter by location if specified
        if (location) {
            orders = orders.filter(order => order.location === location);
        }

        // Sort by timestamp (oldest first)
        orders.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Error getting delivery orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== AI CHEF ====================

// Get menu recommendation based on user craving
app.post('/api/chef/recommend', async (req, res) => {
    try {
        const { craving } = req.body;

        if (!craving) {
            return res.status(400).json({ error: 'Craving is required' });
        }

        // Menu items with keywords
        const menuRecommendations = {
            'Crispy Fish Burger': {
                keywords: ['spicy', 'crispy', 'crunchy', 'fried', 'hot', 'classic'],
                description: 'Our signature Crispy Fish Burger with chipotle sauce is perfect for you! Crispy white fish with a spicy kick, creamy coleslaw, and tangy pickles.',
                price: '95 DH'
            },
            'Po Boy Sandwich': {
                keywords: ['big', 'hungry', 'large', 'filling', 'sandwich', 'american'],
                description: 'Try our Po Boy Sandwich - it\'s huge! A 12-inch Moroccan baguette stuffed with big fried white fish and tartar sauce. Perfect when you\'re super hungry!',
                price: '70 DH'
            },
            'Msemmen Fish Tacos': {
                keywords: ['fusion', 'unique', 'different', 'moroccan', 'tacos', 'flatbread', 'local'],
                description: 'Go for our Msemmen Fish Tacos! A unique fusion of Moroccan flatbread and fresh fish. It\'s our most creative dish!',
                price: '45 DH'
            },
            'Fish Burger (Grilled)': {
                keywords: ['healthy', 'light', 'grilled', 'fresh', 'lean', 'diet'],
                description: 'The Grilled Fish Burger is your best bet! Healthy grilled white fish with cheese, fresh veggies, and tartar sauce. Light but satisfying!',
                price: '90 DH'
            },
            'Octopus Burger': {
                keywords: ['unique', 'special', 'different', 'octopus', 'seafood', 'exotic', 'adventurous'],
                description: 'Be adventurous with our Octopus Burger! Crispy chopped octopus legs with salsa verde. Unique and absolutely delicious!',
                price: '110 DH'
            },
            'Calamari Burger': {
                keywords: ['crispy', 'rings', 'calamari', 'squid', 'crunchy', 'fried'],
                description: 'You\'ll love our Calamari Burger! Crispy calamari rings with lettuce, pickles, and tartar sauce. Crunchy perfection!',
                price: '110 DH'
            },
            'Sardine Burger': {
                keywords: ['local', 'traditional', 'moroccan', 'sardine', 'authentic', 'strong'],
                description: 'Try our Sardine Burger - a local favorite! Double sardine patties with caramelized onions. Authentic Essaouira flavor!',
                price: '90 DH'
            },
            'Eggplant Burger': {
                keywords: ['vegetarian', 'veg', 'veggie', 'plant', 'no meat', 'eggplant'],
                description: 'Our Eggplant Burger is perfect for you! Crispy homemade eggplant patty with cheese and coleslaw. Vegetarian and delicious!',
                price: '90 DH'
            }
        };

        // Convert craving to lowercase for matching
        const cravingLower = craving.toLowerCase();

        // Find best match
        let bestMatch = null;
        let maxScore = 0;

        for (const [dish, data] of Object.entries(menuRecommendations)) {
            let score = 0;
            for (const keyword of data.keywords) {
                if (cravingLower.includes(keyword)) {
                    score++;
                }
            }
            if (score > maxScore) {
                maxScore = score;
                bestMatch = { dish, ...data };
            }
        }

        // If no keyword match, provide a default recommendation
        if (!bestMatch || maxScore === 0) {
            bestMatch = {
                dish: 'Crispy Fish Burger',
                description: 'Can\'t go wrong with our signature Crispy Fish Burger! It\'s our most popular dish with crispy white fish, spicy chipotle sauce, and fresh toppings.',
                price: '95 DH'
            };
        }

        res.json({
            success: true,
            recommendation: {
                dish: bestMatch.dish,
                description: bestMatch.description,
                price: bestMatch.price
            }
        });

    } catch (error) {
        console.error('Error getting recommendation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ANALYTICS ====================

// Get analytics data
app.get('/api/analytics', async (req, res) => {
    try {
        const analytics = await readJSONFile(ANALYTICS_FILE);
        if (!analytics) {
            return res.status(500).json({ error: 'Failed to read analytics data' });
        }

        res.json({ success: true, analytics });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get popular items (sorted by count)
app.get('/api/analytics/popular-items', async (req, res) => {
    try {
        const analytics = await readJSONFile(ANALYTICS_FILE);
        if (!analytics) {
            return res.status(500).json({ error: 'Failed to read analytics data' });
        }

        // Convert to array and sort by count
        const popularItems = Object.entries(analytics.popularItems)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

        res.json({ success: true, popularItems });
    } catch (error) {
        console.error('Error getting popular items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get analytics data
app.get('/api/analytics', async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const orders = await readJSONFile(ORDERS_FILE);

        if (!orders) {
            return res.status(500).json({ error: 'Failed to read orders data' });
        }

        // Filter orders by period
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'all':
            default:
                startDate = new Date(0); // Beginning of time
        }

        const filteredOrders = orders.filter(order => new Date(order.timestamp) >= startDate);

        // Calculate metrics
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = filteredOrders.length;
        const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready', 'out-for-delivery'].includes(o.status)).length;

        // Sales trend (last 7 days)
        const salesByDay = {};
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            labels.push(dateStr);
            salesByDay[dateStr] = 0;
        }

        filteredOrders.forEach(order => {
            const orderDate = new Date(order.timestamp);
            const dayLabel = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
            if (salesByDay[dayLabel] !== undefined) {
                salesByDay[dayLabel] += order.total;
            }
        });

        // Location performance
        const locationCounts = { rooftop: 0, medina: 0, casa: 0 };
        filteredOrders.forEach(order => {
            if (order.location && locationCounts[order.location] !== undefined) {
                locationCounts[order.location]++;
            }
        });

        // Order status breakdown
        const statusCounts = {
            completed: 0,
            preparing: 0,
            pending: 0,
            'out-for-delivery': 0
        };
        orders.forEach(order => {
            if (statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }
        });

        // Popular items
        const itemCounts = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!itemCounts[item.name]) {
                    itemCounts[item.name] = { orders: 0, revenue: 0 };
                }
                itemCounts[item.name].orders++;
                itemCounts[item.name].revenue += item.price;
            });
        });

        const popularItems = Object.entries(itemCounts)
            .map(([name, data]) => ({
                name,
                orders: data.orders,
                revenue: data.revenue,
                growth: Math.floor(Math.random() * 20) + 5 // Mock growth percentage
            }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        res.json({
            success: true,
            metrics: {
                totalRevenue,
                totalOrders,
                avgOrder,
                activeOrders
            },
            charts: {
                salesTrend: {
                    labels,
                    data: labels.map(label => salesByDay[label])
                },
                locationPerformance: [locationCounts.rooftop, locationCounts.medina, locationCounts.casa],
                orderStatus: [statusCounts.completed, statusCounts.preparing, statusCounts.pending, statusCounts['out-for-delivery']]
            },
            popularItems
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`\n🍔 Fish Burger Backend Server`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🚀 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`\n📊 Available routes:`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   POST /api/orders - Create new order`);
    console.log(`   GET  /api/orders - Get all orders`);
    console.log(`   GET  /api/orders/:id - Get specific order`);
    console.log(`   PATCH /api/orders/:id/status - Update order status`);
    console.log(`   GET  /api/analytics - Get analytics data`);
    console.log(`   GET  /api/analytics/popular-items - Get popular items`);
    console.log(`\n✨ Ready to serve!\n`);
});
