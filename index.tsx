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

// --- COMPONENTS ---

const KPICard = ({ value, label }: { value: string | number; label: string }) => (
    <div className="card">
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
    </div>
);


const BarChart = ({ data, title }: { data: { [key: string]: number }; title: string }) => {
    const maxValue = Math.max(0, ...Object.values(data));
    const entries = Object.entries(data);

    return (
        <div className="card">
            <h3 className="card-title">{title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', flexGrow: 1 }}>
                    <div className="chart-container">
                        <div className="bar-chart">
                            {entries.map(([key, value], index) => (
                                <div
                                    key={key}
                                    className="bar"
                                    style={{ height: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%', backgroundColor: `var(--${['primary', 'secondary', 'tertiary', 'quad'][index % 4]}-color)` }}
                                    title={`${key}: ${value.toLocaleString()}`}
                                >
                                  <div className="tooltip">{key}: {value.toLocaleString()}</div>
                                </div>
                            ))}
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

const DataTable = ({ data }) => (
     <div className="card table-container">
        <h3 className="card-title">Attributed Click Details</h3>
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Channel</th>
                        <th>Date</th>
                        <th>Send Country</th>
                        <th>Device</th>
                        <th>Customer Type</th>
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 10).map((row) => ( // Show first 10 rows
                        <tr key={row.user_id}>
                            <td>{row.user_id}</td>
                            <td>{row.channel}</td>
                            <td>{row.timestamp.toLocaleDateString()}</td>
                            <td>{row.send_country}</td>
                            <td>{row.device_info}</td>
                            <td>{row.customer_type}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
     </div>
);

// --- MAIN APP ---

const App = () => {
    const [clickData] = useState(initialClickData);
    const [transactions] = useState(initialTransactions);
    const [filters, setFilters] = useState({
        sendCountry: 'all',
        customerType: 'all',
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const filteredData = useMemo(() => {
        return clickData.filter(d => 
            (filters.sendCountry === 'all' || d.send_country === filters.sendCountry) &&
            (filters.customerType === 'all' || d.customer_type === filters.customerType)
        );
    }, [clickData, filters]);

    const filteredTransactions = useMemo(() => {
        if (!filteredData.length || !transactions.length) return [];
        const filteredUserIds = new Set(filteredData.map(d => d.user_id));
        return transactions.filter(t => filteredUserIds.has(t.user_id));
    }, [filteredData, transactions]);

    const analytics = useMemo(() => {
        const data = filteredData;
        const countBy = (key) => data.reduce((acc, curr) => {
            acc[curr[key]] = (acc[curr[key]] || 0) + 1;
            return acc;
        }, {});
        
        const transactionVolume = filteredTransactions.reduce((acc, curr) => {
            acc[curr.channel] = (acc[curr.channel] || 0) + curr.trx_volume;
            return acc;
        }, {});

        const conversions = filteredTransactions.reduce((acc, curr) => {
            acc[curr.channel] = (acc[curr.channel] || 0) + 1;
            return acc;
        }, {});

        return {
            channel: countBy('channel'),
            device: countBy('device_info'),
            customerType: countBy('customer_type'),
            sendCountry: countBy('send_country'),
            gender: countBy('gender'),
            transactionVolume,
            conversions,
        };
    }, [filteredData, filteredTransactions]);
    
    const uniqueCountries = useMemo(() => ['all', ...Array.from(new Set(initialClickData.map(d => d.send_country)))], []);
    const uniqueCustomerTypes = useMemo(() => ['all', ...Array.from(new Set(initialClickData.map(d => d.customer_type)))], []);

    const totalClicks = filteredData.length;
    const clickThroughRate = totalReached > 0 ? (totalClicks / totalReached) * 100 : 0;

    return (
        <>
            <header className="header">
                <h1>Marketing Attribution Dashboard</h1>
            </header>

            <section className="filters" aria-label="Dashboard Filters">
                <div className="filter-group">
                    <label htmlFor="sendCountry">Sending Country</label>
                    <select id="sendCountry" name="sendCountry" value={filters.sendCountry} onChange={handleFilterChange}>
                        {uniqueCountries.map(c => <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>)}
                    </select>
                </div>
                 <div className="filter-group">
                    <label htmlFor="customerType">Customer Type</label>
                    <select id="customerType" name="customerType" value={filters.customerType} onChange={handleFilterChange}>
                         {uniqueCustomerTypes.map(c => <option key={c} value={c}>{c === 'all' ? 'All Types' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                </div>
            </section>
            
            <main className="dashboard-grid">
                <KPICard value={totalReached.toLocaleString()} label="Total Users Reached" />
                <KPICard value={totalClicks.toLocaleString()} label="Total Attributed Clicks" />
                <KPICard value={clickThroughRate.toFixed(2)+'%'} label="Overall Click-Through Rate" />
                
                <BarChart data={analytics.channel} title="Clicks by Channel" />
                <BarChart data={analytics.conversions} title="Conversions by Channel" />
                <BarChart data={analytics.transactionVolume} title="Transaction Volume by Channel" />
                
                <DataTable data={filteredData} />
            </main>
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);