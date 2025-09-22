import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// --- MOCK DATA GENERATION ---

const MOCK_CONFIG = {
    users: 1000,
    events: 5000,
    startDate: new Date('2024-01-01'),
    endDate: new Date(),
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateMockData = () => {
    const users = [];
    for (let i = 0; i < MOCK_CONFIG.users; i++) {
        const sendCountry = randChoice(['UK', 'USA', 'Germany', 'France', 'Canada']);
        users.push({
            user_id: `user_${i}`,
            gender: randChoice(['Male', 'Female', 'Other']),
            age: rand(18, 65),
            send_country: sendCountry,
            receive_country: randChoice(['Nigeria', 'Pakistan', 'India', 'Ghana', 'Philippines']),
            customer_type: randChoice(['active', 'dormant', 'churned']),
            device_info: randChoice(['iOS', 'Android']),
            platform_type: randChoice(['app', 'website'])
        });
    }

    const events = [];
    for (let i = 0; i < MOCK_CONFIG.events; i++) {
        const timestamp = new Date(rand(MOCK_CONFIG.startDate.getTime(), MOCK_CONFIG.endDate.getTime()));
        events.push({
            event_id: `evt_${i}`,
            user_id: `user_${rand(0, MOCK_CONFIG.users - 1)}`,
            timestamp,
            event_name: randChoice(['push_received', 'popup_received', 'slider_received', 'push_clicked', 'popup_clicked', 'slider_clicked']),
        });
    }

    // --- APPLY FIRST-CLICK ATTRIBUTION ---
    const clickEvents = events
        .filter(e => e.event_name.includes('_clicked'))
        .sort((a, b) => a.timestamp - b.timestamp);

    const attributedClicks = new Map();
    clickEvents.forEach(event => {
        if (!attributedClicks.has(event.user_id)) {
            const channel = event.event_name.replace('_clicked', '');
            const user = users.find(u => u.user_id === event.user_id);
            if(user) {
                attributedClicks.set(event.user_id, {
                    ...user,
                    channel: channel.charAt(0).toUpperCase() + channel.slice(1), // Capitalize
                    timestamp: event.timestamp,
                });
            }
        }
    });

    // --- SIMULATE TRANSACTIONS BASED ON CLICKS (CONVERSIONS) ---
    const transactions = [];
    attributedClicks.forEach(click => {
        // Assume a 40% conversion rate for users who clicked
        if (Math.random() < 0.4) {
            transactions.push({
                user_id: click.user_id,
                channel: click.channel,
                trx_volume: rand(50, 800), // Random transaction volume
                timestamp: new Date(click.timestamp.getTime() + rand(1000 * 60, 1000 * 60 * 60 * 24)) // Sometime after the click
            });
        }
    });

    const receivedEvents = events.filter(e => e.event_name.includes('_received'));
    const totalReached = new Set(receivedEvents.map(e => e.user_id)).size;
    const clickData = Array.from(attributedClicks.values());
    
    return { clickData, totalReached, transactions };
};

const { clickData: initialClickData, totalReached, transactions: initialTransactions } = generateMockData();

// --- HELPERS ---
const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- COMPONENTS ---

const KPICard = ({ value, label }: { value: string | number; label: string }) => (
    <div className="card">
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
    </div>
);


const BarChart = ({ data, title, onBarClick, dataKey, activeFilter }: { 
    data: { [key: string]: number }; 
    title: string;
    onBarClick: (category: string, value: string) => void;
    dataKey: string;
    activeFilter: { category: string; value: string } | null;
}) => {
    const maxValue = Math.max(0, ...Object.values(data));
    const entries = Object.entries(data);

    return (
        <div className="card">
            <h3 className="card-title">{title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', flexGrow: 1 }}>
                    <div className="chart-container">
                        <div className="bar-chart">
                            {entries.map(([key, value], index) => {
                                const isSelected = activeFilter && activeFilter.category === dataKey && activeFilter.value === key;
                                return (
                                    <div
                                        key={key}
                                        className={`bar ${isSelected ? 'selected' : ''}`}
                                        style={{ height: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%', backgroundColor: `var(--${['primary', 'secondary', 'tertiary', 'quad'][index % 4]}-color)` }}
                                        title={`${key}: ${value.toLocaleString()}`}
                                        onClick={() => onBarClick(dataKey, key)}
                                    >
                                      <div className="tooltip">{key}: {value.toLocaleString()}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="bar-chart-x-axis-labels">
                    {entries.map(([key]) => <div key={key} className="bar-chart-label">{key}</div>)}
                </div>
            </div>
        </div>
    );
};

const DataTable = ({ data, activeFilter, onClearFilter }) => (
     <div className="card table-container">
        <div className="table-header">
            <h3 className="card-title">Attributed Click Details</h3>
            {activeFilter && (
                <div className="active-filter-display">
                    <span>Filtering by <strong>{activeFilter.category.replace('_', ' ')}:</strong> {activeFilter.value}</span>
                    <button onClick={onClearFilter} className="clear-filter-btn">Clear</button>
                </div>
            )}
        </div>
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Channel</th>
                        <th>Gender</th>
                        <th>Age</th>
                        <th>Customer Type</th>
                        <th>Device</th>
                        <th>Platform</th>
                        <th>Send Country</th>
                        <th>Click Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr key={row.user_id}>
                            <td>{row.user_id}</td>
                            <td>{row.channel}</td>
                            <td>{row.gender}</td>
                            <td>{row.age}</td>
                            <td>{row.customer_type}</td>
                            <td>{row.device_info}</td>
                            <td>{row.platform_type}</td>
                            <td>{row.send_country}</td>
                            <td>{new Date(row.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const App = () => {
    const [filters, setFilters] = useState({
        startDate: formatDateForInput(MOCK_CONFIG.startDate),
        endDate: formatDateForInput(MOCK_CONFIG.endDate),
        country: 'all',
        device: 'all',
        platform: 'all',
    });
    const [chartFilter, setChartFilter] = useState<{ category: string; value: string } | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setChartFilter(null); // Reset chart filter when main filters change
    };

    const handleBarClick = (category: string, value: string) => {
        if (chartFilter && chartFilter.category === category && chartFilter.value === value) {
            setChartFilter(null);
        } else {
            setChartFilter({ category, value });
        }
    };

    const handleClearChartFilter = () => {
        setChartFilter(null);
    };

    const { filteredClickData, filteredTransactions } = useMemo(() => {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);

        const filteredClicks = initialClickData.filter(d => {
            const date = new Date(d.timestamp);
            const countryMatch = filters.country === 'all' || d.send_country === filters.country;
            const deviceMatch = filters.device === 'all' || d.device_info === filters.device;
            const platformMatch = filters.platform === 'all' || d.platform_type === filters.platform;
            return date >= start && date <= end && countryMatch && deviceMatch && platformMatch;
        });
        
        const clickUserIds = new Set(filteredClicks.map(c => c.user_id));
        const filteredTrans = initialTransactions.filter(t => clickUserIds.has(t.user_id));

        return { filteredClickData: filteredClicks, filteredTransactions: filteredTrans };
    }, [filters]);

    const analytics = useMemo(() => {
        const totalClicks = filteredClickData.length;
        const totalConversions = filteredTransactions.length;
        const totalVolume = filteredTransactions.reduce((acc, curr) => acc + curr.trx_volume, 0);
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

        const reduceToCount = (data, key) => data.reduce((acc, curr) => {
            acc[curr[key]] = (acc[curr[key]] || 0) + 1;
            return acc;
        }, {});

        const channelPerformance = reduceToCount(filteredClickData, 'channel');
        const genderDistribution = reduceToCount(filteredClickData, 'gender');
        const customerTypeDistribution = reduceToCount(filteredClickData, 'customer_type');
        
        const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
        filteredClickData.forEach(user => {
            if (user.age <= 25) ageGroups['18-25']++;
            else if (user.age <= 35) ageGroups['26-35']++;
            else if (user.age <= 45) ageGroups['36-45']++;
            else if (user.age <= 55) ageGroups['46-55']++;
            else ageGroups['56+']++;
        });
        
        const customerTypeFormatted = Object.entries(customerTypeDistribution).reduce((acc, [key, value]) => {
            acc[key.charAt(0).toUpperCase() + key.slice(1)] = value;
            return acc;
        }, {});

        return {
            totalReached,
            totalClicks,
            totalConversions,
            conversionRate,
            totalVolume,
            channelPerformance,
            genderDistribution,
            customerTypeDistribution: customerTypeFormatted,
            ageGroups,
        };
    }, [filteredClickData, filteredTransactions]);
    
    const filteredTableData = useMemo(() => {
        if (!chartFilter) return filteredClickData;
        
        const { category, value } = chartFilter;

        if (category === 'customer_type') {
            return filteredClickData.filter(d => d.customer_type.toLowerCase() === value.toLowerCase());
        }
        if (category === 'age') {
             const [min, maxStr] = value.split(/[-+]/);
             const max = maxStr ? parseInt(maxStr, 10) : Infinity;
             return filteredClickData.filter(d => d.age >= parseInt(min, 10) && d.age <= max);
        }

        return filteredClickData.filter(d => d[category] === value);
    }, [filteredClickData, chartFilter]);

    const uniqueCountries = useMemo(() => ['all', ...Array.from(new Set(initialClickData.map(d => d.send_country)))], []);
    const uniqueDevices = useMemo(() => ['all', ...Array.from(new Set(initialClickData.map(d => d.device_info)))], []);
    const uniquePlatforms = useMemo(() => ['all', ...Array.from(new Set(initialClickData.map(d => d.platform_type)))], []);

    return (
        <>
            <header className="header">
                <h1>Marketing Attribution Dashboard</h1>
            </header>

            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="startDate">Start Date</label>
                    <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                </div>
                <div className="filter-group">
                    <label htmlFor="endDate">End Date</label>
                    <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                </div>
                <div className="filter-group">
                    <label htmlFor="country">Country</label>
                    <select id="country" name="country" value={filters.country} onChange={handleFilterChange}>
                        {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="device">Device</label>
                    <select id="device" name="device" value={filters.device} onChange={handleFilterChange}>
                        {uniqueDevices.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="platform">Platform</label>
                    <select id="platform" name="platform" value={filters.platform} onChange={handleFilterChange}>
                        {uniquePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="dashboard-grid">
                <KPICard value={analytics.totalReached.toLocaleString()} label="Total Users Reached" />
                <KPICard value={analytics.totalClicks.toLocaleString()} label="Attributed Clicks" />
                <KPICard value={analytics.totalConversions.toLocaleString()} label="Total Conversions" />
                <KPICard value={`$${analytics.totalVolume.toLocaleString()}`} label="Total Transaction Volume" />
                <KPICard value={`${analytics.conversionRate.toFixed(2)}%`} label="Click-to-Conversion Rate" />
                <BarChart title="Channel Performance" data={analytics.channelPerformance} onBarClick={handleBarClick} dataKey="channel" activeFilter={chartFilter} />
                
                <div className="section-title-container">
                    <h2 className="section-title">User Segmentation</h2>
                </div>
                <BarChart title="Gender Distribution" data={analytics.genderDistribution} onBarClick={handleBarClick} dataKey="gender" activeFilter={chartFilter} />
                <BarChart title="Age Groups" data={analytics.ageGroups} onBarClick={handleBarClick} dataKey="age" activeFilter={chartFilter} />
                <BarChart title="Customer Type" data={analytics.customerTypeDistribution} onBarClick={handleBarClick} dataKey="customer_type" activeFilter={chartFilter} />
                
                <DataTable data={filteredTableData} activeFilter={chartFilter} onClearFilter={handleClearChartFilter} />
            </div>
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
