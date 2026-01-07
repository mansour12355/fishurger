import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Switch,
    Platform
} from 'react-native';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp
} from 'react-native-responsive-screen';
import {
    Search,
    Bell,
    Menu,
    CalendarCheck,
    ChevronRight,
    Info
} from 'lucide-react-native';

// --- Theme Config ---
const COLORS = {
    background: '#0a0a0f',
    card: '#1e1e2d',
    accent: '#6366f1',
    accentLight: '#818cf8',
    textPrimary: '#ffffff',
    textSecondary: '#6a6a7a',
    textMuted: '#4a4a5a',
    success: '#10b981',
    border: 'rgba(255,255,255,0.05)',
};

// --- Mock Data ---
const DATA = [
    {
        id: '1',
        name: 'Sardine Burger',
        price: 60,
        miniPrice: 45,
        category: 'burgers',
        available: true,
        image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=500&auto=format&fit=crop',
    },
    {
        id: '2',
        name: 'Calamari Burger',
        price: 75,
        miniPrice: 60,
        category: 'burgers',
        available: true,
        image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?q=80&w=500&auto=format&fit=crop',
    },
    {
        id: '3',
        name: 'Double Fish Burger',
        price: 110,
        miniPrice: 85,
        category: 'burgers',
        available: false,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500&auto=format&fit=crop',
    },
    {
        id: '4',
        name: 'Fancy Sardines',
        price: 20,
        miniPrice: null,
        category: 'tapas',
        available: true,
        image: 'https://images.unsplash.com/photo-1599321955726-90471f645676?q=80&w=500&auto=format&fit=crop',
    },
    {
        id: '5',
        name: 'Fish & Chips',
        price: 70,
        miniPrice: 55,
        category: 'globe',
        available: true,
        image: 'https://images.unsplash.com/photo-1579208030886-b1c9d506dab8?q=80&w=500&auto=format&fit=crop',
    },
];

const CATEGORIES = ['All', 'Burgers', 'Sides', 'Tapas', 'Globe'];

// --- Components ---

const CategoryChip = ({ label, active, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[
            styles.chip,
            active && styles.chipActive
        ]}
    >
        <Text style={[
            styles.chipText,
            active && styles.chipTextActive
        ]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const MenuCard = ({ item, onToggle }) => {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTextContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{item.price} DH</Text>
                        {item.miniPrice && (
                            <Text style={styles.miniPrice}>(Mini: {item.miniPrice} DH)</Text>
                        )}
                    </View>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{item.category.toUpperCase()}</Text>
                    </View>
                </View>
                <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                />
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.availability}>
                    <Text style={styles.footerLabel}>Available</Text>
                    <Switch
                        trackColor={{ false: '#2f2f3d', true: COLORS.success }}
                        thumbColor={'#fff'}
                        ios_backgroundColor="#2f2f3d"
                        onValueChange={() => onToggle(item.id)}
                        value={item.available}
                    />
                </View>
                <TouchableOpacity style={styles.cartButton}>
                    <Text style={styles.cartButtonText}>Add to Cart</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function App() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [menuItems, setMenuItems] = useState(DATA);

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [search, selectedCategory, menuItems]);

    const handleToggle = (id) => {
        setMenuItems(prev => prev.map(item =>
            item.id === id ? { ...item, available: !item.available } : item
        ));
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity>
                    <Menu size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                    <CalendarCheck size={22} color={COLORS.accentLight} style={styles.logoIcon} />
                    <Text style={styles.logoText}>DevSync</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Bell size={22} color={COLORS.textPrimary} />
                        <View style={styles.dot} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
                {/* Search Section */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search menu items..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {/* Categories (Sticky) */}
                <View style={styles.categoryContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {CATEGORIES.map(cat => (
                            <CategoryChip
                                key={cat}
                                label={cat}
                                active={selectedCategory === cat}
                                onPress={() => setSelectedCategory(cat)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* List Content */}
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <MenuCard key={item.id} item={item} onToggle={handleToggle} />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Info size={40} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No items found</Text>
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp('5%'),
        height: hp('8%'),
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoIcon: {
        marginRight: 8,
    },
    logoText: {
        color: COLORS.textPrimary,
        fontSize: wp('5.5%'),
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
    },
    iconBtn: {
        position: 'relative',
    },
    dot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        backgroundColor: COLORS.accent,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    searchSection: {
        paddingHorizontal: wp('5%'),
        paddingVertical: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161622',
        borderWidth: 1,
        borderColor: '#232333',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 52,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    categoryContainer: {
        backgroundColor: COLORS.background,
        paddingBottom: 15,
    },
    categoryScroll: {
        paddingHorizontal: wp('5%'),
        gap: 12,
    },
    chip: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#161622',
        borderWidth: 1,
        borderColor: '#232333',
    },
    chipActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
        // Add subtle glow for active chip
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    chipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: wp('5%'),
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    itemName: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    price: {
        color: COLORS.accentLight,
        fontSize: 17,
        fontWeight: '800',
    },
    miniPrice: {
        color: COLORS.accentLight,
        fontSize: 13,
        marginLeft: 6,
        opacity: 0.7,
    },
    tag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 15,
    },
    tagText: {
        color: COLORS.accentLight,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardImage: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: '#161622',
    },
    cardFooter: {
        marginTop: 10,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    availability: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    footerLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    cartButton: {
        backgroundColor: '#232333',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    cartButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: COLORS.textMuted,
        marginTop: 15,
        fontSize: 16,
    }
});
