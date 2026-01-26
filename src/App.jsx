import { useState, useEffect } from 'react';

export default function App() {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).step || 1 : 1;
  });
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).startDate || '' : '';
  });
  const [oldHourlySalary, setOldHourlySalary] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).oldHourlySalary || '' : '';
  });
  const [startingBalance, setStartingBalance] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).startingBalance || '' : '';
  });
  const [withdrawals, setWithdrawals] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).withdrawals || [] : [];
  });
  const [dailyData, setDailyData] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).dailyData || Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] })) : Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] }));
  });
  const [editingDay, setEditingDay] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [tempHours, setTempHours] = useState('');
  const [showSlowDownAlert, setShowSlowDownAlert] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastTradeProfit, setLastTradeProfit] = useState(0);
  const [newTrade, setNewTrade] = useState({
    tokenName: '',
    contractAddress: '',
    entries: [{ price: '', size: '', date: '', time: '' }],
    exits: [{ price: '', size: '', date: '', time: '' }],
    maxPrice: '',
    minPrice: '',
    tradeType: 'scalp',
    reason: '',
    emotions: '',
    lessons: ''
  });

  useEffect(() => {
    localStorage.setItem('cryptoTracker', JSON.stringify({
      step,
      startDate,
      oldHourlySalary,
      startingBalance,
      withdrawals,
      dailyData
    }));
  }, [step, startDate, oldHourlySalary, startingBalance, withdrawals, dailyData]);

  const getAllTrades = () => dailyData.flatMap((day, dayIndex) => day.trades.map(t => ({ ...t, dayIndex })));

  const getHitRate = () => {
    const allTrades = getAllTrades();
    if (allTrades.length === 0) return 0;
    const profitable = allTrades.filter(t => t.actualProfit > 0).length;
    return ((profitable / allTrades.length) * 100).toFixed(1);
  };

  const getTotalProfit = () => dailyData.reduce((sum, day) => sum + day.profit, 0);
  
  const getTotalWithdrawn = () => withdrawals.reduce((sum, w) => sum + w.amount, 0);

  const getYearlySalary = () => parseFloat(oldHourlySalary) * 40 * 52;

  const getCurrentBalance = () => {
    const starting = parseFloat(startingBalance) || 0;
    return starting + getTotalProfit() - getTotalWithdrawn();
  };

  const getDaysSinceStart = () => {
    if (!startDate) return 1;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 1);
  };

  const getExecutionGuide = () => {
    const allTrades = getAllTrades();
    if (allTrades.length < 3) return null;

    const winners = allTrades.filter(t => t.actualProfit > 0);
    const losers = allTrades.filter(t => t.actualProfit < 0);
    const roundtrips = allTrades.filter(t => t.roundtripped);
    
    const avgWinPercent = winners.length > 0 
      ? winners.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / winners.length 
      : 0;
    
    const avgLossPercent = losers.length > 0 
      ? Math.abs(losers.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / losers.length)
      : 0;

    const roundtripPeakPercents = roundtrips
      .filter(t => t.potentialProfitPercent)
      .map(t => t.potentialProfitPercent);
    const avgRoundtripPeak = roundtripPeakPercents.length > 0
      ? roundtripPeakPercents.reduce((a, b) => a + b, 0) / roundtripPeakPercents.length
      : 0;

    const optimalTP = avgRoundtripPeak > 0 ? avgRoundtripPeak * 0.7 : avgWinPercent;

    const dcaTrades = allTrades.filter(t => t.isDCA);
    const dcaWinners = dcaTrades.filter(t => t.actualProfit > 0);
    const dcaLosers = dcaTrades.filter(t => t.actualProfit < 0);
    
    const dcaAvgWinPercent = dcaWinners.length > 0
      ? dcaWinners.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / dcaWinners.length
      : 0;
    const dcaAvgLossPercent = dcaLosers.length > 0
      ? Math.abs(dcaLosers.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / dcaLosers.length)
      : 0;

    const nonDcaTrades = allTrades.filter(t => !t.isDCA);
    const nonDcaWinners = nonDcaTrades.filter(t => t.actualProfit > 0);
    
    const nonDcaAvgWinPercent = nonDcaWinners.length > 0
      ? nonDcaWinners.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / nonDcaWinners.length
      : 0;

    const recommendedStop = avgLossPercent > 0 ? avgLossPercent * 0.6 : 15;

    const dcaWinnerExits = dcaWinners.filter(t => t.actualProfitPercent).map(t => t.actualProfitPercent);
    const dcaOptimalExit = dcaWinnerExits.length > 0
      ? dcaWinnerExits.reduce((a, b) => a + b, 0) / dcaWinnerExits.length
      : optimalTP;

    return {
      avgWinPercent,
      avgLossPercent,
      avgRoundtripPeak,
      optimalTP,
      recommendedStop,
      dcaTrades: dcaTrades.length,
      dcaWinRate: dcaTrades.length > 0 ? (dcaWinners.length / dcaTrades.length * 100) : 0,
      dcaAvgWinPercent,
      dcaAvgLossPercent,
      dcaOptimalExit,
      nonDcaTrades: nonDcaTrades.length,
      nonDcaWinRate: nonDcaTrades.length > 0 ? (nonDcaWinners.length / nonDcaTrades.length * 100) : 0,
      nonDcaAvgWinPercent,
      roundtripCount: roundtrips.length,
      dcaHelps: dcaAvgWinPercent > nonDcaAvgWinPercent || dcaAvgLossPercent < avgLossPercent
    };
  };

  const exportToCSV = () => {
    const allTrades = getAllTrades();
    if (allTrades.length === 0) {
      alert('No trades to export');
      return;
    }

    const headers = [
      'Day', 'Token Name', 'Contract Address', 'Trade Type', 'Entry Date', 'Entry Time',
      'Exit Date', 'Exit Time', 'Hold Time', 'Total In ($)', 'Total Out ($)', 'P&L ($)',
      'P&L (%)', 'Max Price', 'Min Price', 'Potential Profit ($)', 'Missed Profit ($)',
      'Was DCA', 'Roundtripped', 'Early Exit', 'Reason', 'Emotions', 'Lessons',
      'All Entries (Price@Size)', 'All Exits (Price@Size)'
    ];

    const rows = allTrades.map(trade => {
      const firstEntry = trade.entries?.[0] || {};
      const lastExit = trade.exits?.[trade.exits?.length - 1] || {};
      
      return [
        trade.dayIndex + 1, trade.tokenName || '', trade.contractAddress || '', trade.tradeType || '',
        firstEntry.date || '', firstEntry.time || '', lastExit.date || '', lastExit.time || '',
        trade.holdTime || '', trade.totalIn?.toFixed(2) || '', trade.totalOut?.toFixed(2) || '',
        trade.actualProfit?.toFixed(2) || '', trade.actualProfitPercent?.toFixed(2) || '',
        trade.maxPrice || '', trade.minPrice || '', trade.potentialProfit?.toFixed(2) || '',
        trade.missedProfit?.toFixed(2) || '', trade.isDCA ? 'Yes' : 'No', trade.roundtripped ? 'Yes' : 'No',
        trade.savedByEarlyExit ? 'Yes' : 'No', `"${(trade.reason || '').replace(/"/g, '""')}"`,
        `"${(trade.emotions || '').replace(/"/g, '""')}"`, `"${(trade.lessons || '').replace(/"/g, '""')}"`,
        `"${trade.entries?.map(e => `${e.price}@$${e.size}`).join('; ') || ''}"`,
        `"${trade.exits?.map(e => `${e.price}@$${e.size}`).join('; ') || ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `crypto-trades-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    setWithdrawals([...withdrawals, { id: Date.now(), amount, date: withdrawDate }]);
    setWithdrawAmount('');
    setWithdrawDate(new Date().toISOString().split('T')[0]);
    setShowWithdrawModal(false);
  };

  const deleteWithdrawal = (id) => setWithdrawals(withdrawals.filter(w => w.id !== id));

  const calculateHoldTime = (entries, exits) => {
    if (!entries.length || !exits.length) return null;
    const firstEntry = entries[0];
    const lastExit = exits[exits.length - 1];
    if (!firstEntry.date || !lastExit.date) return null;
    
    const open = new Date(`${firstEntry.date}T${firstEntry.time || '00:00'}`);
    const close = new Date(`${lastExit.date}T${lastExit.time || '00:00'}`);
    const diffMs = close - open;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return null;
    if (diffMins < 60) return { text: `${diffMins}m`, mins: diffMins };
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return { text: `${diffHours}h ${diffMins % 60}m`, mins: diffMins };
    const diffDays = Math.floor(diffHours / 24);
    return { text: `${diffDays}d ${diffHours % 24}h`, mins: diffMins };
  };

  const getInsights = () => {
    const allTrades = getAllTrades();
    if (allTrades.length < 3) return [];
    
    const insights = [];
    const guide = getExecutionGuide();
    
    if (guide) {
      if (guide.optimalTP > 0 && guide.avgWinPercent > 0 && guide.avgWinPercent < guide.optimalTP * 0.5) {
        insights.push({ type: 'warning', text: `Selling too early! Avg +${guide.avgWinPercent.toFixed(0)}% but could get +${guide.optimalTP.toFixed(0)}%` });
      }
      if (guide.roundtripCount >= 2 && guide.avgRoundtripPeak > 0) {
        insights.push({ type: 'warning', text: `${guide.roundtripCount} roundtrips! Take profit at +${(guide.avgRoundtripPeak * 0.7).toFixed(0)}%` });
      }
      if (guide.dcaTrades >= 3) {
        if (guide.dcaHelps) {
          insights.push({ type: 'positive', text: `DCA working: ${guide.dcaWinRate.toFixed(0)}% win rate` });
        } else {
          insights.push({ type: 'negative', text: `DCA hurting: only ${guide.dcaWinRate.toFixed(0)}% wins vs ${guide.nonDcaWinRate.toFixed(0)}%` });
        }
      }
    }
    
    const scalps = allTrades.filter(t => t.tradeType === 'scalp');
    const swings = allTrades.filter(t => t.tradeType === 'swing');
    const holds = allTrades.filter(t => t.tradeType === 'hold');
    
    const scalpAvg = scalps.length > 0 ? scalps.reduce((sum, t) => sum + t.actualProfit, 0) / scalps.length : 0;
    const swingAvg = swings.length > 0 ? swings.reduce((sum, t) => sum + t.actualProfit, 0) / swings.length : 0;
    const holdAvg = holds.length > 0 ? holds.reduce((sum, t) => sum + t.actualProfit, 0) / holds.length : 0;
    
    const bestType = [
      { type: 'scalping', avg: scalpAvg, count: scalps.length },
      { type: 'swing trading', avg: swingAvg, count: swings.length },
      { type: 'holding', avg: holdAvg, count: holds.length }
    ].filter(t => t.count >= 2).sort((a, b) => b.avg - a.avg)[0];
    
    if (bestType && bestType.avg > 0) {
      insights.push({ type: 'positive', text: `Best at ${bestType.type}: +$${bestType.avg.toFixed(0)} avg` });
    }
    
    const recentTrades = allTrades.slice(-5);
    const recentWins = recentTrades.filter(t => t.actualProfit > 0).length;
    if (recentWins >= 4) insights.push({ type: 'positive', text: `🔥 Hot streak: ${recentWins}/5 wins` });
    else if (recentWins <= 1) insights.push({ type: 'warning', text: `Cold streak - consider a break` });
    
    return insights.slice(0, 4);
  };

  const calculateOldJobStats = () => {
    const totalProfit = getTotalProfit();
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0);
    const profitableDays = dailyData.filter(day => day.profit > 0).length;
    const losingDays = dailyData.filter(day => day.profit < 0).length;
    const daysOver1k = dailyData.filter(day => day.profit > 1000).length;
    const effectiveHourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;
    const oldYearlyIncome = getYearlySalary();
    const salaryComparison = parseFloat(oldHourlySalary) > 0 
      ? ((effectiveHourlyRate / parseFloat(oldHourlySalary)) * 100 - 100).toFixed(1) : 0;
    const daysSinceStart = getDaysSinceStart();
    const dailyAvgProfit = totalProfit / daysSinceStart;
    const yearlyProjectionFromDaily = dailyAvgProfit * 365;

    return { totalProfit, totalHours, profitableDays, losingDays, daysOver1k, effectiveHourlyRate, 
             oldYearlyIncome, salaryComparison, daysSinceStart, dailyAvgProfit, yearlyProjectionFromDaily };
  };

  const getAdvancedStats = () => {
    const allTrades = getAllTrades();
    if (allTrades.length === 0) return null;

    const winners = allTrades.filter(t => t.actualProfit > 0);
    const losers = allTrades.filter(t => t.actualProfit < 0);
    
    const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.actualProfit, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, t) => sum + t.actualProfit, 0) / losers.length) : 0;
    const winRate = (winners.length / allTrades.length) * 100;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    
    const avgWinPercent = winners.length > 0 ? winners.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / winners.length : 0;
    const avgLossPercent = losers.length > 0 ? Math.abs(losers.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / losers.length) : 0;

    // NEW: Avg trade % and expectancy
    const avgTradePercent = allTrades.reduce((sum, t) => sum + (t.actualProfitPercent || 0), 0) / allTrades.length;
    const expectancy = allTrades.reduce((sum, t) => sum + t.actualProfit, 0) / allTrades.length;

    const roundtrippedTrades = allTrades.filter(t => t.roundtripped);
    const totalRoundtripped = roundtrippedTrades.reduce((sum, t) => sum + Math.abs(t.actualProfit), 0);
    const roundtripCount = roundtrippedTrades.length;
    const totalMissedProfit = allTrades.reduce((sum, t) => sum + (t.missedProfit || 0), 0);

    const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.actualProfit)) : 0;
    const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.actualProfit)) : 0;

    const scalps = allTrades.filter(t => t.tradeType === 'scalp');
    const swings = allTrades.filter(t => t.tradeType === 'swing');
    const holds = allTrades.filter(t => t.tradeType === 'hold');

    const tradeTypeStats = {
      scalp: {
        count: scalps.length,
        winRate: scalps.length > 0 ? (scalps.filter(t => t.actualProfit > 0).length / scalps.length * 100) : 0,
        avgProfit: scalps.length > 0 ? scalps.reduce((sum, t) => sum + t.actualProfit, 0) / scalps.length : 0
      },
      swing: {
        count: swings.length,
        winRate: swings.length > 0 ? (swings.filter(t => t.actualProfit > 0).length / swings.length * 100) : 0,
        avgProfit: swings.length > 0 ? swings.reduce((sum, t) => sum + t.actualProfit, 0) / swings.length : 0
      },
      hold: {
        count: holds.length,
        winRate: holds.length > 0 ? (holds.filter(t => t.actualProfit > 0).length / holds.length * 100) : 0,
        avgProfit: holds.length > 0 ? holds.reduce((sum, t) => sum + t.actualProfit, 0) / holds.length : 0
      }
    };

    const dcaTrades = allTrades.filter(t => t.isDCA);
    const singleEntryTrades = allTrades.filter(t => !t.isDCA);
    
    const dcaStats = {
      count: dcaTrades.length,
      winRate: dcaTrades.length > 0 ? (dcaTrades.filter(t => t.actualProfit > 0).length / dcaTrades.length * 100) : 0,
      avgProfit: dcaTrades.length > 0 ? dcaTrades.reduce((sum, t) => sum + t.actualProfit, 0) / dcaTrades.length : 0,
      singleEntryWinRate: singleEntryTrades.length > 0 ? (singleEntryTrades.filter(t => t.actualProfit > 0).length / singleEntryTrades.length * 100) : 0,
      singleEntryAvgProfit: singleEntryTrades.length > 0 ? singleEntryTrades.reduce((sum, t) => sum + t.actualProfit, 0) / singleEntryTrades.length : 0
    };

    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempWinStreak = 0, tempLossStreak = 0;
    allTrades.forEach(t => {
      if (t.actualProfit > 0) { tempWinStreak++; tempLossStreak = 0; if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak; }
      else if (t.actualProfit < 0) { tempLossStreak++; tempWinStreak = 0; if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak; }
    });
    for (let i = allTrades.length - 1; i >= 0; i--) {
      if (i === allTrades.length - 1) currentStreak = allTrades[i].actualProfit > 0 ? 1 : -1;
      else { if (allTrades[i].actualProfit > 0 && currentStreak > 0) currentStreak++; else if (allTrades[i].actualProfit < 0 && currentStreak < 0) currentStreak--; else break; }
    }

    const emotionTrades = allTrades.filter(t => t.emotions);
    const fomoTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('fomo'));
    const revengeTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('revenge'));
    const calmTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('calm'));
    
    const fomoWinRate = fomoTrades.length > 0 ? (fomoTrades.filter(t => t.actualProfit > 0).length / fomoTrades.length * 100).toFixed(1) : null;
    const revengeWinRate = revengeTrades.length > 0 ? (revengeTrades.filter(t => t.actualProfit > 0).length / revengeTrades.length * 100).toFixed(1) : null;
    const calmWinRate = calmTrades.length > 0 ? (calmTrades.filter(t => t.actualProfit > 0).length / calmTrades.length * 100).toFixed(1) : null;

    const tradesWithTime = allTrades.filter(t => t.holdTimeMins);
    let avgHoldTime = 'N/A', avgWinHoldTime = 'N/A', avgLossHoldTime = 'N/A';
    if (tradesWithTime.length > 0) {
      const avgMins = tradesWithTime.reduce((sum, t) => sum + t.holdTimeMins, 0) / tradesWithTime.length;
      avgHoldTime = avgMins < 60 ? `${Math.floor(avgMins)}m` : `${Math.floor(avgMins / 60)}h ${Math.floor(avgMins % 60)}m`;
      const winTrades = tradesWithTime.filter(t => t.actualProfit > 0);
      const lossTrades = tradesWithTime.filter(t => t.actualProfit < 0);
      if (winTrades.length > 0) { const m = winTrades.reduce((sum, t) => sum + t.holdTimeMins, 0) / winTrades.length; avgWinHoldTime = m < 60 ? `${Math.floor(m)}m` : `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m`; }
      if (lossTrades.length > 0) { const m = lossTrades.reduce((sum, t) => sum + t.holdTimeMins, 0) / lossTrades.length; avgLossHoldTime = m < 60 ? `${Math.floor(m)}m` : `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m`; }
    }

    return {
      totalTrades: allTrades.length, winners: winners.length, losers: losers.length, winRate, avgWin, avgLoss,
      avgWinPercent, avgLossPercent, avgTradePercent, expectancy, profitFactor, largestWin, largestLoss,
      avgHoldTime, avgWinHoldTime, avgLossHoldTime, currentStreak, maxWinStreak, maxLossStreak,
      fomoWinRate, revengeWinRate, calmWinRate, fomoCount: fomoTrades.length, revengeCount: revengeTrades.length,
      calmCount: calmTrades.length, totalMissedProfit, totalRoundtripped, roundtripCount, tradeTypeStats, dcaStats
    };
  };

  const addEntry = () => setNewTrade({ ...newTrade, entries: [...newTrade.entries, { price: '', size: '', date: '', time: '' }] });
  const removeEntry = (i) => { if (newTrade.entries.length > 1) setNewTrade({ ...newTrade, entries: newTrade.entries.filter((_, idx) => idx !== i) }); };
  const updateEntry = (i, field, value) => { const u = [...newTrade.entries]; u[i] = { ...u[i], [field]: value }; setNewTrade({ ...newTrade, entries: u }); };
  const addExit = () => setNewTrade({ ...newTrade, exits: [...newTrade.exits, { price: '', size: '', date: '', time: '' }] });
  const removeExit = (i) => { if (newTrade.exits.length > 1) setNewTrade({ ...newTrade, exits: newTrade.exits.filter((_, idx) => idx !== i) }); };
  const updateExit = (i, field, value) => { const u = [...newTrade.exits]; u[i] = { ...u[i], [field]: value }; setNewTrade({ ...newTrade, exits: u }); };

  const addTrade = () => {
    const validEntries = newTrade.entries.filter(e => e.price && e.size);
    const validExits = newTrade.exits.filter(e => e.price && e.size);
    if (validEntries.length === 0 || validExits.length === 0 || !newTrade.maxPrice || !newTrade.minPrice || editingDay === null) return;
    
    const totalIn = validEntries.reduce((sum, e) => sum + parseFloat(e.size), 0);
    const totalOut = validExits.reduce((sum, e) => sum + parseFloat(e.size), 0);
    const actualProfit = totalOut - totalIn;
    const actualProfitPercent = (actualProfit / totalIn) * 100;
    
    const weightedEntryPrice = validEntries.reduce((sum, e) => sum + (parseFloat(e.price) * parseFloat(e.size)), 0) / totalIn;
    const maxPrice = parseFloat(newTrade.maxPrice);
    const minPrice = parseFloat(newTrade.minPrice);
    
    const potentialProfitPercent = ((maxPrice - weightedEntryPrice) / weightedEntryPrice) * 100;
    const potentialProfit = totalIn * (potentialProfitPercent / 100);
    const maxDrawdownPercent = ((minPrice - weightedEntryPrice) / weightedEntryPrice) * 100;
    const potentialOut = totalIn * (1 + potentialProfitPercent / 100);
    const missedProfit = potentialOut > totalOut ? potentialOut - totalOut : 0;
    
    const wasEverProfitable = maxPrice > weightedEntryPrice;
    const savedByEarlyExit = actualProfit > 0 && totalOut < potentialOut;
    const roundtripped = actualProfit < 0 && wasEverProfitable;
    const holdTimeData = calculateHoldTime(validEntries, validExits);
    
    const trade = {
      id: Date.now(), tokenName: newTrade.tokenName, contractAddress: newTrade.contractAddress,
      entries: validEntries.map(e => ({ ...e, price: parseFloat(e.price), size: parseFloat(e.size) })),
      exits: validExits.map(e => ({ ...e, price: parseFloat(e.price), size: parseFloat(e.size) })),
      totalIn, totalOut, avgEntryPrice: weightedEntryPrice, maxPrice, minPrice, actualProfit, potentialProfit,
      missedProfit, actualProfitPercent, potentialProfitPercent, maxDrawdown: maxDrawdownPercent,
      wasEverProfitable, savedByEarlyExit, roundtripped, holdTime: holdTimeData?.text || null,
      holdTimeMins: holdTimeData?.mins || null, tradeType: newTrade.tradeType, reason: newTrade.reason,
      emotions: newTrade.emotions, lessons: newTrade.lessons, isDCA: validEntries.length > 1, isPartialExit: validExits.length > 1
    };
    
    const newData = [...dailyData];
    newData[editingDay].trades.push(trade);
    newData[editingDay].profit = newData[editingDay].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    setDailyData(newData);
    setNewTrade({ tokenName: '', contractAddress: '', entries: [{ price: '', size: '', date: '', time: '' }], exits: [{ price: '', size: '', date: '', time: '' }], maxPrice: '', minPrice: '', tradeType: 'scalp', reason: '', emotions: '', lessons: '' });
    if (actualProfit > 0) { setLastTradeProfit(actualProfit); setShowSlowDownAlert(true); }
  };

  const deleteTrade = (dayIndex, tradeId) => {
    const newData = [...dailyData];
    newData[dayIndex].trades = newData[dayIndex].trades.filter(t => t.id !== tradeId);
    newData[dayIndex].profit = newData[dayIndex].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    setDailyData(newData);
  };

  const handleStart = () => { if (startDate && oldHourlySalary && startingBalance) setStep(2); };
  const handleDayClick = (dayIndex) => { setEditingDay(dayIndex); setViewMode('day'); setTempHours(dailyData[dayIndex].hours.toString()); };
  const handleSaveDay = () => { if (editingDay !== null) { const newData = [...dailyData]; newData[editingDay] = { ...newData[editingDay], hours: parseFloat(tempHours) || 0 }; setDailyData(newData); setEditingDay(null); setTempHours(''); setViewMode('day'); } };
  const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  const handleReset = () => {
    if (window.confirm('Are you sure? This will delete all your data.')) {
      localStorage.removeItem('cryptoTracker');
      setStep(1); setStartDate(''); setOldHourlySalary(''); setStartingBalance(''); setWithdrawals([]);
      setDailyData(Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] })));
    }
  };

  const renderExecutionGuide = () => {
    const guide = getExecutionGuide();
    if (!guide) return null;

    return (
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-lg shadow-lg text-white mb-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Your Execution Guide</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <div className="text-sm opacity-90">Take Profit At</div>
            <div className="text-3xl font-bold text-green-300">+{guide.optimalTP.toFixed(0)}%</div>
            <div className="text-xs opacity-80 mt-1">Based on roundtrip data</div>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <div className="text-sm opacity-90">Stop Loss At</div>
            <div className="text-3xl font-bold text-red-300">-{guide.recommendedStop.toFixed(0)}%</div>
            <div className="text-xs opacity-80 mt-1">Cut losses early</div>
          </div>
        </div>
        <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
          <div className="text-sm font-semibold mb-2">📊 Your Actual Averages</div>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-xs opacity-80">Avg Win</div><div className="text-xl font-bold text-green-300">+{guide.avgWinPercent.toFixed(1)}%</div></div>
            <div><div className="text-xs opacity-80">Avg Loss</div><div className="text-xl font-bold text-red-300">-{guide.avgLossPercent.toFixed(1)}%</div></div>
          </div>
        </div>
        {guide.roundtripCount > 0 && (
          <div className="bg-white bg-opacity-10 p-4 rounded-lg mb-4">
            <div className="text-sm font-semibold mb-2">🔄 Roundtrip Analysis ({guide.roundtripCount} trades)</div>
            <div className="text-sm">Your roundtrips peaked at <span className="font-bold text-yellow-300">+{guide.avgRoundtripPeak.toFixed(0)}%</span> before dumping.
              <br /><span className="text-xs opacity-80">If you had sold at +{(guide.avgRoundtripPeak * 0.7).toFixed(0)}%, you would have kept profits.</span></div>
          </div>
        )}
        {guide.dcaTrades >= 2 && (
          <div className="bg-white bg-opacity-10 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-2">📈 DCA Strategy ({guide.dcaTrades} trades)</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs opacity-80">DCA Win Rate</div><div className={`font-bold ${guide.dcaWinRate >= guide.nonDcaWinRate ? 'text-green-300' : 'text-red-300'}`}>{guide.dcaWinRate.toFixed(0)}%</div></div>
              <div><div className="text-xs opacity-80">Non-DCA Win Rate</div><div className="font-bold">{guide.nonDcaWinRate.toFixed(0)}%</div></div>
              <div><div className="text-xs opacity-80">DCA Avg Win</div><div className="text-green-300">+{guide.dcaAvgWinPercent.toFixed(1)}%</div></div>
              <div><div className="text-xs opacity-80">DCA Avg Loss</div><div className="text-red-300">-{guide.dcaAvgLossPercent.toFixed(1)}%</div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-white border-opacity-20">
              {guide.dcaHelps ? <div className="text-green-300 text-sm">✅ DCA is helping! Take profit at +{guide.dcaOptimalExit.toFixed(0)}% on DCA trades</div>
                : <div className="text-red-300 text-sm">⚠️ DCA is hurting you. Consider smaller initial positions instead.</div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWithdrawalProgress = () => {
    const totalWithdrawn = getTotalWithdrawn();
    const yearlySalary = getYearlySalary();
    const progressPercent = Math.min((totalWithdrawn / yearlySalary) * 100, 100);
    
    return (
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-lg shadow-lg text-white mb-6">
        <div className="flex justify-between items-start mb-4">
          <div><div className="text-sm opacity-80">Total Withdrawn</div><div className="text-3xl font-bold">{formatCurrency(totalWithdrawn)}</div></div>
          <button onClick={() => setShowWithdrawModal(true)} className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50">+ Withdraw</button>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1"><span>Progress to yearly salary</span><span>{progressPercent.toFixed(1)}%</span></div>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-4"><div className="bg-white h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div>
          <div className="flex justify-between text-xs mt-1 opacity-80"><span>$0</span><span>{formatCurrency(yearlySalary)}</span></div>
        </div>
        {totalWithdrawn >= yearlySalary && <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg text-center">🎉 You've withdrawn a full year's salary!</div>}
        {withdrawals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white border-opacity-20">
            <div className="text-sm font-semibold mb-2">Recent Withdrawals</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {withdrawals.slice().reverse().slice(0, 5).map(w => (
                <div key={w.id} className="flex justify-between items-center text-sm bg-white bg-opacity-10 p-2 rounded">
                  <span>{w.date}</span><span className="font-semibold">{formatCurrency(w.amount)}</span>
                  <button onClick={() => deleteWithdrawal(w.id)} className="text-red-300 hover:text-red-100 text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInsightsBar = () => {
    const insights = getInsights();
    if (insights.length === 0) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2"><span className="text-yellow-400">💡</span><span className="font-semibold text-sm">AI Insights</span></div>
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded-full ${insight.type === 'positive' ? 'bg-green-600' : insight.type === 'warning' ? 'bg-yellow-600' : 'bg-red-600'}`}>{insight.text}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayGrid = () => {
    const rows = [];
    for (let row = 0; row < 5; row++) {
      const dayCells = [];
      for (let col = 0; col < 73; col++) {
        const dayIndex = row * 73 + col;
        if (dayIndex >= 365) break;
        const day = dailyData[dayIndex];
        let cellClass = "w-2 h-2 m-0.5 rounded-sm cursor-pointer transition-all hover:scale-150 ";
        if (day.profit > 1000) cellClass += "bg-emerald-600 shadow-lg";
        else if (day.profit > 0) cellClass += "bg-green-500";
        else if (day.profit < 0) cellClass += "bg-red-500";
        else cellClass += "bg-gray-200";
        dayCells.push(<div key={dayIndex} className={cellClass} onClick={() => handleDayClick(dayIndex)} title={`Day ${dayIndex + 1}: ${formatCurrency(day.profit)}`} />);
      }
      rows.push(<div key={row} className="flex justify-center">{dayCells}</div>);
    }
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Your 365-Day Journey</h2>
        <div className="flex flex-col gap-1">{rows}</div>
        <div className="flex justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center"><div className="w-4 h-4 bg-emerald-600 mr-2 rounded"></div><span className="text-gray-600">$1K+</span></div>
          <div className="flex items-center"><div className="w-4 h-4 bg-green-500 mr-2 rounded"></div><span className="text-gray-600">Profit</span></div>
          <div className="flex items-center"><div className="w-4 h-4 bg-red-500 mr-2 rounded"></div><span className="text-gray-600">Loss</span></div>
          <div className="flex items-center"><div className="w-4 h-4 bg-gray-200 mr-2 rounded"></div><span className="text-gray-600">No data</span></div>
        </div>
      </div>
    );
  };

  const renderBalanceCard = () => {
    const starting = parseFloat(startingBalance) || 0;
    const totalProfit = getTotalProfit();
    const totalWithdrawn = getTotalWithdrawn();
    const currentBalance = getCurrentBalance();
    const percentChange = starting > 0 ? ((currentBalance + totalWithdrawn - starting) / starting * 100).toFixed(2) : 0;
    
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-lg shadow-lg text-white mb-6">
        <div className="flex justify-between items-start">
          <div><div className="text-sm opacity-80">Current Balance</div><div className="text-4xl font-bold">{formatCurrency(currentBalance)}</div></div>
          <div className="text-right"><div className="text-sm opacity-80">Starting</div><div className="text-lg">{formatCurrency(starting)}</div></div>
        </div>
        <div className="mt-4 pt-4 border-t border-white border-opacity-20 grid grid-cols-3 gap-4">
          <div><div className="text-sm opacity-80">Total P&L</div><div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>{totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}</div></div>
          <div><div className="text-sm opacity-80">Withdrawn</div><div className="text-lg font-bold text-yellow-300">{formatCurrency(totalWithdrawn)}</div></div>
          <div className="text-right"><div className="text-sm opacity-80">Total Return</div><div className={`text-lg font-bold ${percentChange >= 0 ? 'text-green-300' : 'text-red-300'}`}>{percentChange >= 0 ? '+' : ''}{percentChange}%</div></div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const stats = getAdvancedStats();
    const jobStats = calculateOldJobStats();

    return (
      <div className="space-y-6 pb-24">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-lg shadow-lg text-white">
          <div className="text-center">
            <div className="text-sm opacity-80 mb-1">At this rate, you're on track to earn</div>
            <div className="text-4xl font-bold mb-2">{formatCurrency(jobStats.yearlyProjectionFromDaily)}</div>
            <div className="text-sm opacity-80">per year</div>
            <div className="mt-4 pt-4 border-t border-white border-opacity-20 grid grid-cols-2 gap-4 text-sm">
              <div><div className="opacity-80">Daily Average</div><div className="font-bold text-lg">{formatCurrency(jobStats.dailyAvgProfit)}</div></div>
              <div><div className="opacity-80">Days Tracked</div><div className="font-bold text-lg">{jobStats.daysSinceStart}</div></div>
            </div>
          </div>
        </div>

        {renderExecutionGuide()}

        <div className="flex justify-end">
          <button onClick={exportToCSV} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">📊 Export CSV</button>
        </div>

        {stats && (
          <>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 Trading Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-gray-800">{stats.totalTrades}</div>
                  <div className="text-xs text-gray-600">Total Trades</div>
                </div>
                <div className="bg-green-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Win Rate</div>
                </div>
                <div className={`p-4 rounded text-center ${stats.avgTradePercent >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-2xl font-bold ${stats.avgTradePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.avgTradePercent >= 0 ? '+' : ''}{stats.avgTradePercent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">Avg Trade</div>
                </div>
                <div className={`p-4 rounded text-center ${stats.expectancy >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-2xl font-bold ${stats.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.expectancy >= 0 ? '+' : ''}{formatCurrency(stats.expectancy)}
                  </div>
                  <div className="text-xs text-gray-600">Expectancy</div>
                </div>
                <div className="bg-purple-50 p-4 rounded text-center">
                  <div className={`text-2xl font-bold ${stats.currentStreak > 0 ? 'text-green-600' : stats.currentStreak < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
                  </div>
                  <div className="text-xs text-gray-600">Streak</div>
                </div>
                <div className="bg-blue-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Profit Factor</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-orange-600 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">💸 Money Lost to Bad Execution</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <div className="text-sm opacity-90">Roundtripped</div>
                  <div className="text-3xl font-bold">{formatCurrency(stats.totalRoundtripped)}</div>
                  <div className="text-sm opacity-80">{stats.roundtripCount} trades</div>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <div className="text-sm opacity-90">Left on Table</div>
                  <div className="text-3xl font-bold">{formatCurrency(stats.totalMissedProfit)}</div>
                  <div className="text-sm opacity-80">missed profit</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white bg-opacity-10 rounded-lg text-sm">
                <strong>Total execution cost:</strong> {formatCurrency(stats.totalRoundtripped + stats.totalMissedProfit)}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Trade Type Analysis</h2>
              <div className="grid grid-cols-3 gap-4">
                {['scalp', 'swing', 'hold'].map(type => (
                  <div key={type} className={`p-4 rounded ${stats.tradeTypeStats[type].avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-bold text-gray-800 capitalize">{type}</div>
                    <div className="text-sm text-gray-600">{stats.tradeTypeStats[type].count} trades</div>
                    <div className="text-sm text-gray-600">{stats.tradeTypeStats[type].winRate.toFixed(0)}% win</div>
                    <div className={`font-bold ${stats.tradeTypeStats[type].avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.tradeTypeStats[type].avgProfit)} avg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats.dcaStats.count > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">📈 DCA Analysis</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded ${stats.dcaStats.avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-bold text-gray-800">DCA Trades</div>
                    <div className="text-sm text-gray-600">{stats.dcaStats.count} trades</div>
                    <div className={`font-bold ${stats.dcaStats.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stats.dcaStats.avgProfit)} avg</div>
                  </div>
                  <div className={`p-4 rounded ${stats.dcaStats.singleEntryAvgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-bold text-gray-800">Single Entry</div>
                    <div className="text-sm text-gray-600">{stats.totalTrades - stats.dcaStats.count} trades</div>
                    <div className={`font-bold ${stats.dcaStats.singleEntryAvgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stats.dcaStats.singleEntryAvgProfit)} avg</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Win/Loss</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-lg font-bold text-green-600">{stats.winners} Wins</div>
                  <div className="text-sm text-gray-600">Avg: {formatCurrency(stats.avgWin)} (+{stats.avgWinPercent.toFixed(1)}%)</div>
                  <div className="text-sm text-gray-600">Largest: {formatCurrency(stats.largestWin)}</div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <div className="text-lg font-bold text-red-600">{stats.losers} Losses</div>
                  <div className="text-sm text-gray-600">Avg: {formatCurrency(stats.avgLoss)} (-{stats.avgLossPercent.toFixed(1)}%)</div>
                  <div className="text-sm text-gray-600">Largest: {formatCurrency(Math.abs(stats.largestLoss))}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">⏱️ Hold Time</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded text-center"><div className="text-2xl font-bold text-gray-800">{stats.avgHoldTime}</div><div className="text-xs text-gray-600">Average</div></div>
                <div className="bg-green-50 p-4 rounded text-center"><div className="text-2xl font-bold text-green-600">{stats.avgWinHoldTime}</div><div className="text-xs text-gray-600">Winners</div></div>
                <div className="bg-red-50 p-4 rounded text-center"><div className="text-2xl font-bold text-red-600">{stats.avgLossHoldTime}</div><div className="text-xs text-gray-600">Losers</div></div>
              </div>
            </div>

            {(stats.fomoCount > 0 || stats.revengeCount > 0 || stats.calmCount > 0) && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">🧠 Emotions</h2>
                <div className="grid grid-cols-3 gap-4">
                  {stats.calmCount > 0 && <div className="bg-blue-50 p-4 rounded text-center"><div className="text-2xl font-bold text-blue-600">{stats.calmWinRate}%</div><div className="text-xs text-gray-600">Calm ({stats.calmCount})</div></div>}
                  {stats.fomoCount > 0 && <div className="bg-yellow-50 p-4 rounded text-center"><div className="text-2xl font-bold text-yellow-600">{stats.fomoWinRate}%</div><div className="text-xs text-gray-600">FOMO ({stats.fomoCount})</div></div>}
                  {stats.revengeCount > 0 && <div className="bg-red-50 p-4 rounded text-center"><div className="text-2xl font-bold text-red-600">{stats.revengeWinRate}%</div><div className="text-xs text-gray-600">Revenge ({stats.revengeCount})</div></div>}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">💼 Old Job vs Trading</h2>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Old hourly:</span><span className="font-semibold">{formatCurrency(parseFloat(oldHourlySalary))}/hr</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Trading hourly:</span><span className={`font-semibold ${jobStats.effectiveHourlyRate >= parseFloat(oldHourlySalary) ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(jobStats.effectiveHourlyRate)}/hr</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Difference:</span><span className={`font-bold ${jobStats.salaryComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>{jobStats.salaryComparison >= 0 ? '+' : ''}{jobStats.salaryComparison}%</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📅 Days</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded"><div className="text-2xl font-bold text-green-600">{jobStats.profitableDays}</div><div className="text-xs text-gray-600">Profitable</div></div>
            <div className="text-center p-3 bg-red-50 rounded"><div className="text-2xl font-bold text-red-600">{jobStats.losingDays}</div><div className="text-xs text-gray-600">Losing</div></div>
            <div className="text-center p-3 bg-emerald-50 rounded"><div className="text-2xl font-bold text-emerald-600">{jobStats.daysOver1k}</div><div className="text-xs text-gray-600">$1K+</div></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 pt-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Crypto Trading Journey</h1>
        <p className="text-gray-600 mb-6">Track your progress, learn from your patterns</p>
        
        {step === 1 ? (
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Let's Get Started</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">When did you start?</label><input type="date" className="w-full p-3 border border-gray-300 rounded-md" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Old hourly salary ($)</label><input type="number" className="w-full p-3 border border-gray-300 rounded-md" value={oldHourlySalary} onChange={(e) => setOldHourlySalary(e.target.value)} placeholder="25" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Starting Balance ($)</label><input type="number" className="w-full p-3 border border-gray-300 rounded-md" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder="25000" /></div>
              <button onClick={handleStart} className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold" disabled={!startDate || !oldHourlySalary || !startingBalance}>Start Tracking</button>
            </div>
          </div>
        ) : (
          <>
            {renderBalanceCard()}
            {renderWithdrawalProgress()}
            {renderDayGrid()}
            {renderStats()}
            <button onClick={handleReset} className="mt-8 w-full bg-gray-600 text-white py-3 rounded-md hover:bg-gray-700 font-semibold">Reset Journey</button>
          </>
        )}
      </div>

      {step === 2 && renderInsightsBar()}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Record Withdrawal</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Date</label><input type="date" className="w-full p-3 border rounded-md" value={withdrawDate} onChange={(e) => setWithdrawDate(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label><input type="number" className="w-full p-3 border rounded-md" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="1000" /></div>
              <div className="flex gap-2">
                <button onClick={handleWithdraw} className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-semibold">Withdraw</button>
                <button onClick={() => setShowWithdrawModal(false)} className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSlowDownAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-lg shadow-2xl max-w-md w-full text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🛑✋</div>
              <h2 className="text-3xl font-bold mb-2">STOP!</h2>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg mb-4"><div className="text-3xl font-bold text-green-200">+{formatCurrency(lastTradeProfit)}</div></div>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg mb-4"><div className="text-sm opacity-90">Your Hit Rate</div><div className="text-4xl font-bold">{getHitRate()}%</div></div>
              <div className="space-y-2 text-left bg-white bg-opacity-20 p-4 rounded-lg mb-6 text-sm">
                <p>1. 📤 Withdraw 100% of this profit NOW</p>
                <p>2. ⏰ Wait at least 15 minutes</p>
                <p>3. 🎯 Only enter if setup is A+</p>
              </div>
              <button onClick={() => setShowSlowDownAlert(false)} className="w-full bg-white text-orange-600 py-3 rounded-md font-bold">I Will Withdraw & Wait 💪</button>
            </div>
          </div>
        </div>
      )}

      {editingDay !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Overview</button>
              <button onClick={() => setViewMode('trades')} className={`px-4 py-2 rounded ${viewMode === 'trades' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Trades</button>
            </div>

            {viewMode === 'day' ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Day {editingDay + 1}</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Total P&L</label><div className={`w-full p-3 rounded-md font-semibold ${dailyData[editingDay].profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{formatCurrency(dailyData[editingDay].profit)}</div></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Hours Traded</label><input type="number" className="w-full p-2 border rounded-md" value={tempHours} onChange={(e) => setTempHours(e.target.value)} placeholder="8" /></div>
                  <div className="flex gap-2"><button onClick={handleSaveDay} className="flex-1 bg-blue-600 text-white py-2 rounded-md">Save</button><button onClick={() => setEditingDay(null)} className="flex-1 bg-gray-300 py-2 rounded-md">Close</button></div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">Day {editingDay + 1} - Trades</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-3">Add Trade</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Token Name</label><input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.tokenName} onChange={(e) => setNewTrade({...newTrade, tokenName: e.target.value})} placeholder="e.g., PEPE" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Contract Address</label><input type="text" className="w-full p-2 border rounded text-sm font-mono" value={newTrade.contractAddress} onChange={(e) => setNewTrade({...newTrade, contractAddress: e.target.value})} placeholder="0x..." /></div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Trade Type</label>
                    <div className="flex gap-2">{['scalp', 'swing', 'hold'].map(type => (<button key={type} onClick={() => setNewTrade({ ...newTrade, tradeType: type })} className={`px-4 py-2 rounded text-sm capitalize ${newTrade.tradeType === type ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{type}</button>))}</div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2"><label className="text-xs font-medium text-gray-700">Entries (buys)</label><button onClick={addEntry} className="text-xs text-blue-600 hover:underline">+ Add Entry</button></div>
                    {newTrade.entries.map((entry, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                        <input type="date" className="p-2 border rounded text-xs" value={entry.date} onChange={(e) => updateEntry(i, 'date', e.target.value)} />
                        <input type="time" className="p-2 border rounded text-xs" value={entry.time} onChange={(e) => updateEntry(i, 'time', e.target.value)} />
                        <input type="number" step="any" placeholder="MC/Price" className="p-2 border rounded text-xs" value={entry.price} onChange={(e) => updateEntry(i, 'price', e.target.value)} />
                        <input type="number" placeholder="$ Size" className="p-2 border rounded text-xs" value={entry.size} onChange={(e) => updateEntry(i, 'size', e.target.value)} />
                        {newTrade.entries.length > 1 && <button onClick={() => removeEntry(i)} className="text-red-500 text-xs">✕</button>}
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2"><label className="text-xs font-medium text-gray-700">Exits (sells)</label><button onClick={addExit} className="text-xs text-blue-600 hover:underline">+ Add Exit</button></div>
                    {newTrade.exits.map((exit, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                        <input type="date" className="p-2 border rounded text-xs" value={exit.date} onChange={(e) => updateExit(i, 'date', e.target.value)} />
                        <input type="time" className="p-2 border rounded text-xs" value={exit.time} onChange={(e) => updateExit(i, 'time', e.target.value)} />
                        <input type="number" step="any" placeholder="MC/Price" className="p-2 border rounded text-xs" value={exit.price} onChange={(e) => updateExit(i, 'price', e.target.value)} />
                        <input type="number" placeholder="$ Out" className="p-2 border rounded text-xs" value={exit.size} onChange={(e) => updateExit(i, 'size', e.target.value)} />
                        {newTrade.exits.length > 1 && <button onClick={() => removeExit(i)} className="text-red-500 text-xs">✕</button>}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Max Price (ATH)</label><input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.maxPrice} onChange={(e) => setNewTrade({...newTrade, maxPrice: e.target.value})} /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Min Price (ATL)</label><input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.minPrice} onChange={(e) => setNewTrade({...newTrade, minPrice: e.target.value})} /></div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-2">📝 Journal (optional)</p>
                    <div className="space-y-2">
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.reason} onChange={(e) => setNewTrade({...newTrade, reason: e.target.value})} placeholder="Why did you take this trade?" />
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.emotions} onChange={(e) => setNewTrade({...newTrade, emotions: e.target.value})} placeholder="Emotions? (fomo, calm, revenge...)" />
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.lessons} onChange={(e) => setNewTrade({...newTrade, lessons: e.target.value})} placeholder="Lessons learned?" />
                    </div>
                  </div>
                  <button onClick={addTrade} className="w-full mt-3 bg-green-600 text-white py-2 rounded text-sm">Add Trade</button>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <h4 className="font-semibold mb-2">History ({dailyData[editingDay].trades.length})</h4>
                  {dailyData[editingDay].trades.length === 0 ? <p className="text-gray-500 text-sm">No trades yet.</p> : (
                    <div className="space-y-2">
                      {dailyData[editingDay].trades.map((trade) => (
                        <div key={trade.id} className="border p-3 rounded bg-white text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium flex items-center gap-2">
                              {trade.tokenName && <span className="font-bold">{trade.tokenName}</span>}
                              <span className={`px-2 py-0.5 rounded text-xs ${trade.tradeType === 'scalp' ? 'bg-blue-100 text-blue-700' : trade.tradeType === 'swing' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{trade.tradeType}</span>
                              {trade.isDCA && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">DCA</span>}
                              {trade.holdTime && <span className="text-gray-500 text-xs">({trade.holdTime})</span>}
                            </span>
                            <button onClick={() => deleteTrade(editingDay, trade.id)} className="text-red-600 text-xs">Delete</button>
                          </div>
                          {trade.contractAddress && <div className="text-xs text-gray-400 font-mono truncate mb-1">{trade.contractAddress}</div>}
                          {trade.roundtripped && <div className="text-xs text-red-600 font-semibold">🔄 ROUNDTRIP! (peaked at +{trade.potentialProfitPercent?.toFixed(0)}%)</div>}
                          {trade.savedByEarlyExit && <div className="text-xs text-green-600 font-semibold">✅ EARLY EXIT!</div>}
                          <div className="text-xs text-gray-500 mt-1">In: {trade.entries?.map((e) => `${formatCurrency(e.size)} @ $${e.price}`).join(' + ')}</div>
                          <div className="text-xs text-gray-500">Out: {trade.exits?.map((e) => `${formatCurrency(e.size)} @ $${e.price}`).join(' + ')}</div>
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-2">
                            <div>Total In: {formatCurrency(trade.totalIn)}</div>
                            <div>Total Out: {formatCurrency(trade.totalOut)}</div>
                            <div className={`font-bold col-span-2 text-base ${trade.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>P&L: {formatCurrency(trade.actualProfit)} ({trade.actualProfitPercent?.toFixed(1)}%)</div>
                          </div>
                          {(trade.reason || trade.emotions || trade.lessons) && (
                            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                              {trade.reason && <p><strong>Why:</strong> {trade.reason}</p>}
                              {trade.emotions && <p><strong>Emotions:</strong> {trade.emotions}</p>}
                              {trade.lessons && <p><strong>Lessons:</strong> {trade.lessons}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setEditingDay(null)} className="mt-4 w-full bg-gray-300 py-2 rounded-md">Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
