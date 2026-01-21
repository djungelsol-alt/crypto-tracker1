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
  const [dailyData, setDailyData] = useState(() => {
    const saved = localStorage.getItem('cryptoTracker');
    return saved ? JSON.parse(saved).dailyData || Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] })) : Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] }));
  });
  const [editingDay, setEditingDay] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [tempHours, setTempHours] = useState('');
  const [showSlowDownAlert, setShowSlowDownAlert] = useState(false);
  const [lastTradeProfit, setLastTradeProfit] = useState(0);
  const [newTrade, setNewTrade] = useState({
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
      dailyData
    }));
  }, [step, startDate, oldHourlySalary, startingBalance, dailyData]);

  const getAllTrades = () => dailyData.flatMap(day => day.trades);

  const getHitRate = () => {
    const allTrades = getAllTrades();
    if (allTrades.length === 0) return 0;
    const profitable = allTrades.filter(t => t.actualProfit > 0).length;
    return ((profitable / allTrades.length) * 100).toFixed(1);
  };

  const getTotalProfit = () => dailyData.reduce((sum, day) => sum + day.profit, 0);

  const getCurrentBalance = () => {
    const starting = parseFloat(startingBalance) || 0;
    return starting + getTotalProfit();
  };

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
    
    // Trade type analysis
    const scalps = allTrades.filter(t => t.tradeType === 'scalp');
    const swings = allTrades.filter(t => t.tradeType === 'swing');
    const holds = allTrades.filter(t => t.tradeType === 'hold');
    
    const scalpWinRate = scalps.length > 0 ? (scalps.filter(t => t.actualProfit > 0).length / scalps.length * 100) : 0;
    const swingWinRate = swings.length > 0 ? (swings.filter(t => t.actualProfit > 0).length / swings.length * 100) : 0;
    const holdWinRate = holds.length > 0 ? (holds.filter(t => t.actualProfit > 0).length / holds.length * 100) : 0;
    
    const scalpAvgProfit = scalps.length > 0 ? scalps.reduce((sum, t) => sum + t.actualProfit, 0) / scalps.length : 0;
    const swingAvgProfit = swings.length > 0 ? swings.reduce((sum, t) => sum + t.actualProfit, 0) / swings.length : 0;
    const holdAvgProfit = holds.length > 0 ? holds.reduce((sum, t) => sum + t.actualProfit, 0) / holds.length : 0;
    
    const bestType = [
      { type: 'scalping', rate: scalpWinRate, avg: scalpAvgProfit, count: scalps.length },
      { type: 'swing trading', rate: swingWinRate, avg: swingAvgProfit, count: swings.length },
      { type: 'holding', rate: holdWinRate, avg: holdAvgProfit, count: holds.length }
    ].filter(t => t.count >= 2).sort((a, b) => b.avg - a.avg)[0];
    
    if (bestType && bestType.avg > 0) {
      insights.push({ type: 'positive', text: `You're best at ${bestType.type} (${bestType.rate.toFixed(0)}% win rate, avg +$${bestType.avg.toFixed(0)})` });
    }
    
    const worstType = [
      { type: 'scalping', rate: scalpWinRate, avg: scalpAvgProfit, count: scalps.length },
      { type: 'swing trading', rate: swingWinRate, avg: swingAvgProfit, count: swings.length },
      { type: 'holding', rate: holdWinRate, avg: holdAvgProfit, count: holds.length }
    ].filter(t => t.count >= 2).sort((a, b) => a.avg - b.avg)[0];
    
    if (worstType && worstType.avg < 0) {
      insights.push({ type: 'negative', text: `Avoid ${worstType.type} - losing avg $${Math.abs(worstType.avg).toFixed(0)} per trade` });
    }
    
    // DCA analysis
    const dcaTrades = allTrades.filter(t => t.entries && t.entries.length > 1);
    if (dcaTrades.length >= 2) {
      const dcaWinRate = dcaTrades.filter(t => t.actualProfit > 0).length / dcaTrades.length * 100;
      const dcaAvgProfit = dcaTrades.reduce((sum, t) => sum + t.actualProfit, 0) / dcaTrades.length;
      const singleEntryTrades = allTrades.filter(t => !t.entries || t.entries.length === 1);
      const singleAvgProfit = singleEntryTrades.length > 0 ? singleEntryTrades.reduce((sum, t) => sum + t.actualProfit, 0) / singleEntryTrades.length : 0;
      
      if (dcaAvgProfit < singleAvgProfit - 50) {
        insights.push({ type: 'warning', text: `DCA is hurting you! Avg -$${Math.abs(dcaAvgProfit - singleAvgProfit).toFixed(0)} worse than single entries` });
      } else if (dcaAvgProfit > singleAvgProfit + 50) {
        insights.push({ type: 'positive', text: `DCA is working! Avg +$${(dcaAvgProfit - singleAvgProfit).toFixed(0)} better than single entries` });
      }
    }
    
    // Partial exit analysis
    const partialExitTrades = allTrades.filter(t => t.exits && t.exits.length > 1);
    if (partialExitTrades.length >= 2) {
      const partialAvgProfit = partialExitTrades.reduce((sum, t) => sum + t.actualProfit, 0) / partialExitTrades.length;
      const singleExitTrades = allTrades.filter(t => !t.exits || t.exits.length === 1);
      const singleExitAvg = singleExitTrades.length > 0 ? singleExitTrades.reduce((sum, t) => sum + t.actualProfit, 0) / singleExitTrades.length : 0;
      
      if (partialAvgProfit > singleExitAvg + 50) {
        insights.push({ type: 'positive', text: `Scaling out is working well for you (+$${(partialAvgProfit - singleExitAvg).toFixed(0)} avg)` });
      }
    }
    
    // Hold time analysis
    const tradesWithTime = allTrades.filter(t => t.holdTimeMins);
    if (tradesWithTime.length >= 5) {
      const winners = tradesWithTime.filter(t => t.actualProfit > 0);
      const losers = tradesWithTime.filter(t => t.actualProfit < 0);
      
      const avgWinHold = winners.length > 0 ? winners.reduce((sum, t) => sum + t.holdTimeMins, 0) / winners.length : 0;
      const avgLossHold = losers.length > 0 ? losers.reduce((sum, t) => sum + t.holdTimeMins, 0) / losers.length : 0;
      
      if (avgLossHold > avgWinHold * 1.5 && avgLossHold > 30) {
        insights.push({ type: 'warning', text: `You hold losers too long (${Math.floor(avgLossHold)}min avg vs ${Math.floor(avgWinHold)}min for winners)` });
      }
      
      // Quick scalp analysis
      const quickTrades = tradesWithTime.filter(t => t.holdTimeMins < 15);
      const longerTrades = tradesWithTime.filter(t => t.holdTimeMins >= 15);
      
      if (quickTrades.length >= 3 && longerTrades.length >= 3) {
        const quickWinRate = quickTrades.filter(t => t.actualProfit > 0).length / quickTrades.length * 100;
        const longerWinRate = longerTrades.filter(t => t.actualProfit > 0).length / longerTrades.length * 100;
        
        if (quickWinRate > longerWinRate + 15) {
          insights.push({ type: 'positive', text: `Quick trades (<15min) working better: ${quickWinRate.toFixed(0)}% vs ${longerWinRate.toFixed(0)}%` });
        } else if (longerWinRate > quickWinRate + 15) {
          insights.push({ type: 'positive', text: `Patience pays off: longer holds at ${longerWinRate.toFixed(0)}% vs ${quickWinRate.toFixed(0)}%` });
        }
      }
    }
    
    // Emotion patterns
    const emotionTrades = allTrades.filter(t => t.emotions);
    if (emotionTrades.length >= 3) {
      const fomoTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('fomo'));
      const calmTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('calm'));
      
      if (fomoTrades.length >= 2) {
        const fomoWinRate = fomoTrades.filter(t => t.actualProfit > 0).length / fomoTrades.length * 100;
        if (fomoWinRate < 40) {
          insights.push({ type: 'warning', text: `FOMO trades only ${fomoWinRate.toFixed(0)}% win rate - slow down!` });
        }
      }
      
      if (calmTrades.length >= 2) {
        const calmWinRate = calmTrades.filter(t => t.actualProfit > 0).length / calmTrades.length * 100;
        if (calmWinRate > 60) {
          insights.push({ type: 'positive', text: `Calm trades at ${calmWinRate.toFixed(0)}% - stay patient!` });
        }
      }
    }
    
    // Recent streak
    const recentTrades = allTrades.slice(-5);
    const recentWins = recentTrades.filter(t => t.actualProfit > 0).length;
    if (recentWins >= 4) {
      insights.push({ type: 'positive', text: `🔥 Hot streak! ${recentWins}/5 recent trades profitable` });
    } else if (recentWins <= 1) {
      insights.push({ type: 'warning', text: `Cold streak - consider taking a break` });
    }
    
    return insights.slice(0, 4);
  };

  const calculateOldJobStats = () => {
    const totalProfit = getTotalProfit();
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0);
    const profitableDays = dailyData.filter(day => day.profit > 0).length;
    const losingDays = dailyData.filter(day => day.profit < 0).length;
    const daysOver1k = dailyData.filter(day => day.profit > 1000).length;
    
    const avgDailyProfit = totalProfit / 365;
    const effectiveHourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;
    
    const oldYearlyIncome = parseFloat(oldHourlySalary) * 40 * 52;
    
    const daysWorked = dailyData.filter(day => day.hours > 0).length;
    const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
    const hoursPerDayForProjection = Math.max(8, avgHoursPerDay);
    
    const tradingAnnualProjection = effectiveHourlyRate * hoursPerDayForProjection * 365;
    
    const profitNeeded = oldYearlyIncome - totalProfit;
    const dailyEarningsAtCurrentRate = effectiveHourlyRate * hoursPerDayForProjection;
    const daysToSurpassOldJob = dailyEarningsAtCurrentRate > 0 
      ? Math.ceil(profitNeeded / dailyEarningsAtCurrentRate) 
      : Infinity;

    const salaryComparison = parseFloat(oldHourlySalary) > 0 
      ? ((effectiveHourlyRate / parseFloat(oldHourlySalary)) * 100 - 100).toFixed(1)
      : 0;

    return {
      totalProfit,
      totalHours,
      profitableDays,
      losingDays,
      daysOver1k,
      avgDailyProfit,
      effectiveHourlyRate,
      oldYearlyIncome,
      daysWorked,
      avgHoursPerDay,
      hoursPerDayForProjection,
      tradingAnnualProjection,
      daysToSurpassOldJob,
      salaryComparison
    };
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
    
    const avgWinPercent = winners.length > 0 ? winners.reduce((sum, t) => sum + t.actualProfitPercent, 0) / winners.length : 0;
    const avgLossPercent = losers.length > 0 ? Math.abs(losers.reduce((sum, t) => sum + t.actualProfitPercent, 0) / losers.length) : 0;

    const totalMissedProfit = allTrades.reduce((sum, t) => sum + (t.missedProfit || 0), 0);
    const totalPotentialProfit = allTrades.reduce((sum, t) => sum + (t.potentialProfit || 0), 0);
    
    const avgPotentialProfitPercent = allTrades.reduce((sum, t) => sum + (t.potentialProfitPercent || 0), 0) / allTrades.length;
    const optimalTakeProfitPercent = avgPotentialProfitPercent * 0.85;

    const losingTrades = allTrades.filter(t => t.actualProfit < 0);
    const avgMaxDrawdown = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + Math.abs(t.maxDrawdown || 0), 0) / losingTrades.length 
      : 0;
    const recommendedStopLoss = Math.min(avgMaxDrawdown * 0.5, 15);

    const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.actualProfit)) : 0;
    const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.actualProfit)) : 0;

    // Trade type breakdown
    const scalps = allTrades.filter(t => t.tradeType === 'scalp');
    const swings = allTrades.filter(t => t.tradeType === 'swing');
    const holds = allTrades.filter(t => t.tradeType === 'hold');

    const tradeTypeStats = {
      scalp: {
        count: scalps.length,
        winRate: scalps.length > 0 ? (scalps.filter(t => t.actualProfit > 0).length / scalps.length * 100) : 0,
        avgProfit: scalps.length > 0 ? scalps.reduce((sum, t) => sum + t.actualProfit, 0) / scalps.length : 0,
        totalProfit: scalps.reduce((sum, t) => sum + t.actualProfit, 0)
      },
      swing: {
        count: swings.length,
        winRate: swings.length > 0 ? (swings.filter(t => t.actualProfit > 0).length / swings.length * 100) : 0,
        avgProfit: swings.length > 0 ? swings.reduce((sum, t) => sum + t.actualProfit, 0) / swings.length : 0,
        totalProfit: swings.reduce((sum, t) => sum + t.actualProfit, 0)
      },
      hold: {
        count: holds.length,
        winRate: holds.length > 0 ? (holds.filter(t => t.actualProfit > 0).length / holds.length * 100) : 0,
        avgProfit: holds.length > 0 ? holds.reduce((sum, t) => sum + t.actualProfit, 0) / holds.length : 0,
        totalProfit: holds.reduce((sum, t) => sum + t.actualProfit, 0)
      }
    };

    // DCA analysis
    const dcaTrades = allTrades.filter(t => t.entries && t.entries.length > 1);
    const singleEntryTrades = allTrades.filter(t => !t.entries || t.entries.length === 1);
    
    const dcaStats = {
      count: dcaTrades.length,
      winRate: dcaTrades.length > 0 ? (dcaTrades.filter(t => t.actualProfit > 0).length / dcaTrades.length * 100) : 0,
      avgProfit: dcaTrades.length > 0 ? dcaTrades.reduce((sum, t) => sum + t.actualProfit, 0) / dcaTrades.length : 0,
      singleEntryWinRate: singleEntryTrades.length > 0 ? (singleEntryTrades.filter(t => t.actualProfit > 0).length / singleEntryTrades.length * 100) : 0,
      singleEntryAvgProfit: singleEntryTrades.length > 0 ? singleEntryTrades.reduce((sum, t) => sum + t.actualProfit, 0) / singleEntryTrades.length : 0
    };

    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    allTrades.forEach(t => {
      if (t.actualProfit > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      } else if (t.actualProfit < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      }
    });

    for (let i = allTrades.length - 1; i >= 0; i--) {
      if (i === allTrades.length - 1) {
        currentStreak = allTrades[i].actualProfit > 0 ? 1 : -1;
      } else {
        if (allTrades[i].actualProfit > 0 && currentStreak > 0) currentStreak++;
        else if (allTrades[i].actualProfit < 0 && currentStreak < 0) currentStreak--;
        else break;
      }
    }

    const emotionTrades = allTrades.filter(t => t.emotions);
    const fomoTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('fomo'));
    const revengeTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('revenge'));
    const calmTrades = emotionTrades.filter(t => t.emotions.toLowerCase().includes('calm'));
    
    const fomoWinRate = fomoTrades.length > 0 ? (fomoTrades.filter(t => t.actualProfit > 0).length / fomoTrades.length * 100).toFixed(1) : null;
    const revengeWinRate = revengeTrades.length > 0 ? (revengeTrades.filter(t => t.actualProfit > 0).length / revengeTrades.length * 100).toFixed(1) : null;
    const calmWinRate = calmTrades.length > 0 ? (calmTrades.filter(t => t.actualProfit > 0).length / calmTrades.length * 100).toFixed(1) : null;

    // Hold time stats
    const tradesWithTime = allTrades.filter(t => t.holdTimeMins);
    let avgHoldTime = 'N/A';
    let avgWinHoldTime = 'N/A';
    let avgLossHoldTime = 'N/A';
    
    if (tradesWithTime.length > 0) {
      const avgMins = tradesWithTime.reduce((sum, t) => sum + t.holdTimeMins, 0) / tradesWithTime.length;
      avgHoldTime = avgMins < 60 ? `${Math.floor(avgMins)}m` : `${Math.floor(avgMins / 60)}h ${Math.floor(avgMins % 60)}m`;
      
      const winTrades = tradesWithTime.filter(t => t.actualProfit > 0);
      const lossTrades = tradesWithTime.filter(t => t.actualProfit < 0);
      
      if (winTrades.length > 0) {
        const winMins = winTrades.reduce((sum, t) => sum + t.holdTimeMins, 0) / winTrades.length;
        avgWinHoldTime = winMins < 60 ? `${Math.floor(winMins)}m` : `${Math.floor(winMins / 60)}h ${Math.floor(winMins % 60)}m`;
      }
      if (lossTrades.length > 0) {
        const lossMins = lossTrades.reduce((sum, t) => sum + t.holdTimeMins, 0) / lossTrades.length;
        avgLossHoldTime = lossMins < 60 ? `${Math.floor(lossMins)}m` : `${Math.floor(lossMins / 60)}h ${Math.floor(lossMins % 60)}m`;
      }
    }

    return {
      totalTrades: allTrades.length,
      winners: winners.length,
      losers: losers.length,
      winRate,
      avgWin,
      avgLoss,
      avgWinPercent,
      avgLossPercent,
      profitFactor,
      largestWin,
      largestLoss,
      avgHoldTime,
      avgWinHoldTime,
      avgLossHoldTime,
      currentStreak,
      maxWinStreak,
      maxLossStreak,
      fomoWinRate,
      revengeWinRate,
      calmWinRate,
      fomoCount: fomoTrades.length,
      revengeCount: revengeTrades.length,
      calmCount: calmTrades.length,
      totalMissedProfit,
      optimalTakeProfitPercent,
      avgMaxDrawdown,
      recommendedStopLoss,
      tradeTypeStats,
      dcaStats
    };
  };

  const addEntry = () => {
    setNewTrade({
      ...newTrade,
      entries: [...newTrade.entries, { price: '', size: '', date: '', time: '' }]
    });
  };

  const removeEntry = (index) => {
    if (newTrade.entries.length > 1) {
      setNewTrade({
        ...newTrade,
        entries: newTrade.entries.filter((_, i) => i !== index)
      });
    }
  };

  const updateEntry = (index, field, value) => {
    const updated = [...newTrade.entries];
    updated[index] = { ...updated[index], [field]: value };
    setNewTrade({ ...newTrade, entries: updated });
  };

  const addExit = () => {
    setNewTrade({
      ...newTrade,
      exits: [...newTrade.exits, { price: '', size: '', date: '', time: '' }]
    });
  };

  const removeExit = (index) => {
    if (newTrade.exits.length > 1) {
      setNewTrade({
        ...newTrade,
        exits: newTrade.exits.filter((_, i) => i !== index)
      });
    }
  };

  const updateExit = (index, field, value) => {
    const updated = [...newTrade.exits];
    updated[index] = { ...updated[index], [field]: value };
    setNewTrade({ ...newTrade, exits: updated });
  };

  const addTrade = () => {
    const validEntries = newTrade.entries.filter(e => e.price && e.size);
    const validExits = newTrade.exits.filter(e => e.price && e.size);
    
    if (validEntries.length === 0 || validExits.length === 0 || !newTrade.maxPrice || !newTrade.minPrice) return;
    if (editingDay === null) return;
    
    // Calculate weighted average entry
    const totalEntrySize = validEntries.reduce((sum, e) => sum + parseFloat(e.size), 0);
    const weightedEntryPrice = validEntries.reduce((sum, e) => sum + (parseFloat(e.price) * parseFloat(e.size)), 0) / totalEntrySize;
    
    // Calculate weighted average exit
    const totalExitSize = validExits.reduce((sum, e) => sum + parseFloat(e.size), 0);
    const weightedExitPrice = validExits.reduce((sum, e) => sum + (parseFloat(e.price) * parseFloat(e.size)), 0) / totalExitSize;
    
    const maxPrice = parseFloat(newTrade.maxPrice);
    const minPrice = parseFloat(newTrade.minPrice);
    
    // Use smaller of entry/exit size for P&L calc (in case of partial)
    const positionSize = Math.min(totalEntrySize, totalExitSize);
    
    const actualProfitPercent = ((weightedExitPrice - weightedEntryPrice) / weightedEntryPrice) * 100;
    const potentialProfitPercent = ((maxPrice - weightedEntryPrice) / weightedEntryPrice) * 100;
    const maxDrawdownPercent = ((minPrice - weightedEntryPrice) / weightedEntryPrice) * 100;
    const missedPercent = maxPrice > weightedExitPrice ? ((maxPrice - weightedExitPrice) / weightedExitPrice) * 100 : 0;
    
    const actualProfit = positionSize * (actualProfitPercent / 100);
    const potentialProfit = positionSize * (potentialProfitPercent / 100);
    const missedProfit = maxPrice > weightedExitPrice ? positionSize * missedPercent / 100 : 0;
    
    const wasEverProfitable = maxPrice > weightedEntryPrice;
    const savedByEarlyExit = actualProfit > 0 && weightedExitPrice < maxPrice;
    const roundtripped = actualProfit < 0 && wasEverProfitable;

    const holdTimeData = calculateHoldTime(validEntries, validExits);
    
    const trade = {
      id: Date.now(),
      entries: validEntries.map(e => ({ ...e, price: parseFloat(e.price), size: parseFloat(e.size) })),
      exits: validExits.map(e => ({ ...e, price: parseFloat(e.price), size: parseFloat(e.size) })),
      avgEntry: weightedEntryPrice,
      avgExit: weightedExitPrice,
      maxPrice,
      minPrice,
      positionSize,
      actualProfit,
      potentialProfit,
      missedProfit,
      missedPercent,
      actualProfitPercent,
      potentialProfitPercent,
      maxDrawdown: maxDrawdownPercent,
      wasEverProfitable,
      savedByEarlyExit,
      roundtripped,
      holdTime: holdTimeData?.text || null,
      holdTimeMins: holdTimeData?.mins || null,
      tradeType: newTrade.tradeType,
      reason: newTrade.reason,
      emotions: newTrade.emotions,
      lessons: newTrade.lessons,
      isDCA: validEntries.length > 1,
      isPartialExit: validExits.length > 1
    };
    
    const newData = [...dailyData];
    newData[editingDay].trades.push(trade);
    
    const dayProfit = newData[editingDay].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    newData[editingDay].profit = dayProfit;
    
    setDailyData(newData);
    setNewTrade({
      entries: [{ price: '', size: '', date: '', time: '' }],
      exits: [{ price: '', size: '', date: '', time: '' }],
      maxPrice: '',
      minPrice: '',
      tradeType: 'scalp',
      reason: '',
      emotions: '',
      lessons: ''
    });
    
    if (actualProfit > 0) {
      setLastTradeProfit(actualProfit);
      setShowSlowDownAlert(true);
    }
  };

  const deleteTrade = (dayIndex, tradeId) => {
    const newData = [...dailyData];
    newData[dayIndex].trades = newData[dayIndex].trades.filter(t => t.id !== tradeId);
    const dayProfit = newData[dayIndex].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    newData[dayIndex].profit = dayProfit;
    setDailyData(newData);
  };

  const handleStart = () => {
    if (startDate && oldHourlySalary && startingBalance) {
      setStep(2);
    }
  };

  const handleDayClick = (dayIndex) => {
    setEditingDay(dayIndex);
    setViewMode('day');
    setTempHours(dailyData[dayIndex].hours.toString());
  };

  const handleSaveDay = () => {
    if (editingDay !== null) {
      const newData = [...dailyData];
      newData[editingDay] = { ...newData[editingDay], hours: parseFloat(tempHours) || 0 };
      setDailyData(newData);
      setEditingDay(null);
      setTempHours('');
      setViewMode('day');
    }
  };

  const getMotivationalQuote = (stats) => {
    if (stats.avgDailyProfit > 1000) {
      return { quote: "You're making over $1,000 per day. Let that sink in.", subtext: "Most people work a full week to make what you're averaging in a single day." };
    } else if (stats.profitableDays > stats.losingDays) {
      return { quote: "It's not a race. You're profitable, and that means you're on track.", subtext: "More winning days than losing days. You're building something sustainable." };
    } else if (stats.totalProfit > 0) {
      return { quote: "Progress isn't linear. You're still net positive.", subtext: "Every profitable trader has rough patches. What matters is the long-term trend." };
    } else {
      return { quote: "This is part of the journey. Every master was once a beginner.", subtext: "Focus on learning, refining your strategy, and protecting your capital." };
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const renderInsightsBar = () => {
    const insights = getInsights();
    if (insights.length === 0) return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">💡</span>
            <span className="font-semibold text-sm">AI Insights</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <div 
                key={i} 
                className={`text-xs px-3 py-1.5 rounded-full ${
                  insight.type === 'positive' ? 'bg-green-600' :
                  insight.type === 'warning' ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
              >
                {insight.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayGrid = () => {
    const rows = [];
    const daysPerRow = 73;
    for (let row = 0; row < 5; row++) {
      const dayCells = [];
      for (let col = 0; col < daysPerRow; col++) {
        const dayIndex = row * daysPerRow + col;
        if (dayIndex >= 365) break;
        const day = dailyData[dayIndex];
        let cellClass = "w-2 h-2 m-0.5 rounded-sm cursor-pointer transition-all hover:scale-150 ";
        if (day.profit > 1000) cellClass += "bg-emerald-600 shadow-lg";
        else if (day.profit > 0) cellClass += "bg-green-500";
        else if (day.profit < 0) cellClass += "bg-red-500";
        else cellClass += "bg-gray-200";
        dayCells.push(
          <div key={dayIndex} className={cellClass} onClick={() => handleDayClick(dayIndex)} title={`Day ${dayIndex + 1}: ${formatCurrency(day.profit)}`} />
        );
      }
      rows.push(<div key={row} className="flex justify-center">{dayCells}</div>);
    }
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
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
    const currentBalance = getCurrentBalance();
    const percentChange = starting > 0 ? ((currentBalance - starting) / starting * 100).toFixed(2) : 0;
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-lg shadow-lg text-white mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm opacity-80">Current Balance</div>
            <div className="text-4xl font-bold">{formatCurrency(currentBalance)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">Starting</div>
            <div className="text-lg">{formatCurrency(starting)}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white border-opacity-20 flex justify-between">
          <div>
            <div className="text-sm opacity-80">Total P&L</div>
            <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">Change</div>
            <div className={`text-xl font-bold ${percentChange >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {percentChange >= 0 ? '+' : ''}{percentChange}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const stats = getAdvancedStats();
    const jobStats = calculateOldJobStats();
    const quote = getMotivationalQuote(jobStats);

    return (
      <div className="mt-8 space-y-6 pb-24">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg text-white">
          <div className="text-2xl font-bold mb-2">{quote.quote}</div>
          <div className="text-blue-100 text-sm">{quote.subtext}</div>
        </div>

        {stats && (
          <>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 Trading Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-gray-800">{stats.totalTrades}</div>
                  <div className="text-xs text-gray-600">Total Trades</div>
                </div>
                <div className="bg-green-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Win Rate</div>
                </div>
                <div className="bg-blue-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Profit Factor</div>
                </div>
                <div className="bg-purple-50 p-4 rounded text-center">
                  <div className={`text-2xl font-bold ${stats.currentStreak > 0 ? 'text-green-600' : stats.currentStreak < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
                  </div>
                  <div className="text-xs text-gray-600">Current Streak</div>
                </div>
              </div>
            </div>

            {/* Trade Type Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Trade Type Analysis</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded ${stats.tradeTypeStats.scalp.avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-bold text-gray-800">Scalp</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.scalp.count} trades</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.scalp.winRate.toFixed(0)}% win</div>
                  <div className={`font-bold ${stats.tradeTypeStats.scalp.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.tradeTypeStats.scalp.avgProfit)} avg
                  </div>
                </div>
                <div className={`p-4 rounded ${stats.tradeTypeStats.swing.avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-bold text-gray-800">Swing</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.swing.count} trades</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.swing.winRate.toFixed(0)}% win</div>
                  <div className={`font-bold ${stats.tradeTypeStats.swing.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.tradeTypeStats.swing.avgProfit)} avg
                  </div>
                </div>
                <div className={`p-4 rounded ${stats.tradeTypeStats.hold.avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-bold text-gray-800">Hold</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.hold.count} trades</div>
                  <div className="text-sm text-gray-600">{stats.tradeTypeStats.hold.winRate.toFixed(0)}% win</div>
                  <div className={`font-bold ${stats.tradeTypeStats.hold.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.tradeTypeStats.hold.avgProfit)} avg
                  </div>
                </div>
              </div>
            </div>

            {/* DCA Analysis */}
            {stats.dcaStats.count > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">📈 DCA Analysis</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded ${stats.dcaStats.avgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-bold text-gray-800">DCA Trades</div>
                    <div className="text-sm text-gray-600">{stats.dcaStats.count} trades</div>
                    <div className="text-sm text-gray-600">{stats.dcaStats.winRate.toFixed(0)}% win rate</div>
                    <div className={`font-bold ${stats.dcaStats.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.dcaStats.avgProfit)} avg
                    </div>
                  </div>
                  <div className={`p-4 rounded ${stats.dcaStats.singleEntryAvgProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-bold text-gray-800">Single Entry</div>
                    <div className="text-sm text-gray-600">{stats.totalTrades - stats.dcaStats.count} trades</div>
                    <div className="text-sm text-gray-600">{stats.dcaStats.singleEntryWinRate.toFixed(0)}% win rate</div>
                    <div className={`font-bold ${stats.dcaStats.singleEntryAvgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.dcaStats.singleEntryAvgProfit)} avg
                    </div>
                  </div>
                </div>
                {stats.dcaStats.avgProfit < stats.dcaStats.singleEntryAvgProfit - 20 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ Your DCA trades are underperforming. Consider sticking to single entries.
                  </div>
                )}
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Win/Loss Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-lg font-bold text-green-600">{stats.winners} Wins</div>
                  <div className="text-sm text-gray-600">Avg Win: {formatCurrency(stats.avgWin)}</div>
                  <div className="text-sm text-gray-600">Avg Win %: {stats.avgWinPercent.toFixed(2)}%</div>
                  <div className="text-sm text-gray-600">Largest: {formatCurrency(stats.largestWin)}</div>
                  <div className="text-sm text-gray-600">Max Streak: {stats.maxWinStreak}</div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <div className="text-lg font-bold text-red-600">{stats.losers} Losses</div>
                  <div className="text-sm text-gray-600">Avg Loss: {formatCurrency(stats.avgLoss)}</div>
                  <div className="text-sm text-gray-600">Avg Loss %: {stats.avgLossPercent.toFixed(2)}%</div>
                  <div className="text-sm text-gray-600">Largest: {formatCurrency(Math.abs(stats.largestLoss))}</div>
                  <div className="text-sm text-gray-600">Max Streak: {stats.maxLossStreak}</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">🛑 Stop Loss Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm opacity-90">Avg Max Drawdown</div>
                  <div className="text-3xl font-bold">{stats.avgMaxDrawdown.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Recommended Stop</div>
                  <div className="text-3xl font-bold">{stats.recommendedStopLoss.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">💰 Money Left on Table</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm opacity-90">Missed Profit</div>
                  <div className="text-3xl font-bold">{formatCurrency(stats.totalMissedProfit)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Optimal TP</div>
                  <div className="text-3xl font-bold">{stats.optimalTakeProfitPercent.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">⏱️ Hold Time Analysis</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-gray-800">{stats.avgHoldTime}</div>
                  <div className="text-xs text-gray-600">Avg Hold</div>
                </div>
                <div className="bg-green-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.avgWinHoldTime}</div>
                  <div className="text-xs text-gray-600">Avg Winner</div>
                </div>
                <div className="bg-red-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.avgLossHoldTime}</div>
                  <div className="text-xs text-gray-600">Avg Loser</div>
                </div>
              </div>
            </div>

            {(stats.fomoCount > 0 || stats.revengeCount > 0 || stats.calmCount > 0) && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">🧠 Emotion Analysis</h2>
                <div className="grid grid-cols-3 gap-4">
                  {stats.calmCount > 0 && (
                    <div className="bg-blue-50 p-4 rounded text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.calmWinRate}%</div>
                      <div className="text-xs text-gray-600">Calm ({stats.calmCount})</div>
                    </div>
                  )}
                  {stats.fomoCount > 0 && (
                    <div className="bg-yellow-50 p-4 rounded text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.fomoWinRate}%</div>
                      <div className="text-xs text-gray-600">FOMO ({stats.fomoCount})</div>
                    </div>
                  )}
                  {stats.revengeCount > 0 && (
                    <div className="bg-red-50 p-4 rounded text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.revengeWinRate}%</div>
                      <div className="text-xs text-gray-600">Revenge ({stats.revengeCount})</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">💼 Old Job vs Trading</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Old hourly rate:</span>
              <span className="font-semibold text-gray-800">{formatCurrency(parseFloat(oldHourlySalary))}/hr</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Trading hourly rate:</span>
              <span className={`font-semibold ${jobStats.effectiveHourlyRate >= parseFloat(oldHourlySalary) ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(jobStats.effectiveHourlyRate)}/hr
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Difference:</span>
              <span className={`font-bold text-lg ${jobStats.salaryComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {jobStats.salaryComparison >= 0 ? '+' : ''}{jobStats.salaryComparison}%
              </span>
            </div>
            
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Old annual salary:</div>
              <div className="text-lg font-semibold text-gray-800">{formatCurrency(jobStats.oldYearlyIncome)}</div>
              <div className="text-sm text-gray-600 mt-3 mb-1">Trading projection:</div>
              <div className={`text-lg font-semibold ${jobStats.tradingAnnualProjection >= jobStats.oldYearlyIncome ? 'text-green-600' : 'text-gray-800'}`}>
                {formatCurrency(jobStats.tradingAnnualProjection)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">📅 Day Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{jobStats.profitableDays}</div>
              <div className="text-xs text-gray-600">Profitable</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{jobStats.losingDays}</div>
              <div className="text-xs text-gray-600">Losing</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded">
              <div className="text-2xl font-bold text-emerald-600">{jobStats.daysOver1k}</div>
              <div className="text-xs text-gray-600">$1K+</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleReset = () => {
    if (window.confirm('Are you sure? This will delete all your data.')) {
      localStorage.removeItem('cryptoTracker');
      setStep(1);
      setStartDate('');
      setOldHourlySalary('');
      setStartingBalance('');
      setDailyData(Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] })));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 pt-16 pb-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Crypto Trading Journey</h1>
        <p className="text-gray-600 mb-8">Track your progress, learn from your patterns</p>
        
        {step === 1 ? (
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Let's Get Started</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">When did you start?</label>
                <input type="date" className="w-full p-3 border border-gray-300 rounded-md" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Old hourly salary ($)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-md" value={oldHourlySalary} onChange={(e) => setOldHourlySalary(e.target.value)} placeholder="25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Starting Balance ($)</label>
                <input type="number" className="w-full p-3 border border-gray-300 rounded-md" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder="25000" />
              </div>
              <button onClick={handleStart} className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold" disabled={!startDate || !oldHourlySalary || !startingBalance}>
                Start Tracking
              </button>
            </div>
          </div>
        ) : (
          <>
            {renderBalanceCard()}
            {renderDayGrid()}
            {renderStats()}
            <button onClick={handleReset} className="mt-8 w-full bg-gray-600 text-white py-3 rounded-md hover:bg-gray-700 font-semibold">Reset Journey</button>
          </>
        )}
      </div>

      {step === 2 && renderInsightsBar()}

      {showSlowDownAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-lg shadow-2xl max-w-md w-full text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">🛑✋</div>
              <h2 className="text-3xl font-bold mb-2">STOP!</h2>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg mb-4">
                <div className="text-3xl font-bold text-green-200">+{formatCurrency(lastTradeProfit)}</div>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg mb-4">
                <div className="text-sm opacity-90">Your Hit Rate</div>
                <div className="text-4xl font-bold">{getHitRate()}%</div>
              </div>
              <div className="space-y-2 text-left bg-white bg-opacity-20 p-4 rounded-lg mb-6 text-sm">
                <p>1. 📤 Withdraw 100% of this profit NOW</p>
                <p>2. ⏰ Wait at least 15 minutes</p>
                <p>3. 🎯 Only enter if setup is A+</p>
              </div>
              <button onClick={() => setShowSlowDownAlert(false)} className="w-full bg-white text-orange-600 py-3 rounded-md font-bold">
                I Will Withdraw & Wait 💪
              </button>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total P&L</label>
                    <div className="w-full p-3 bg-gray-100 rounded-md font-semibold">{formatCurrency(dailyData[editingDay].profit)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours Traded</label>
                    <input type="number" className="w-full p-2 border rounded-md" value={tempHours} onChange={(e) => setTempHours(e.target.value)} placeholder="8" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveDay} className="flex-1 bg-blue-600 text-white py-2 rounded-md">Save</button>
                    <button onClick={() => setEditingDay(null)} className="flex-1 bg-gray-300 py-2 rounded-md">Close</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">Day {editingDay + 1} - Trades</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-3">Add Trade</h4>
                  
                  {/* Trade Type */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Trade Type</label>
                    <div className="flex gap-2">
                      {['scalp', 'swing', 'hold'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewTrade({ ...newTrade, tradeType: type })}
                          className={`px-4 py-2 rounded text-sm capitalize ${newTrade.tradeType === type ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-gray-700">Entries (buys)</label>
                      <button onClick={addEntry} className="text-xs text-blue-600 hover:underline">+ Add Entry</button>
                    </div>
                    {newTrade.entries.map((entry, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                        <input type="date" className="p-2 border rounded text-xs" value={entry.date} onChange={(e) => updateEntry(i, 'date', e.target.value)} />
                        <input type="time" className="p-2 border rounded text-xs" value={entry.time} onChange={(e) => updateEntry(i, 'time', e.target.value)} />
                        <input type="number" step="any" placeholder="Price" className="p-2 border rounded text-xs" value={entry.price} onChange={(e) => updateEntry(i, 'price', e.target.value)} />
                        <input type="number" placeholder="Size $" className="p-2 border rounded text-xs" value={entry.size} onChange={(e) => updateEntry(i, 'size', e.target.value)} />
                        {newTrade.entries.length > 1 && (
                          <button onClick={() => removeEntry(i)} className="text-red-500 text-xs">✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Exits */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-gray-700">Exits (sells)</label>
                      <button onClick={addExit} className="text-xs text-blue-600 hover:underline">+ Add Exit</button>
                    </div>
                    {newTrade.exits.map((exit, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                        <input type="date" className="p-2 border rounded text-xs" value={exit.date} onChange={(e) => updateExit(i, 'date', e.target.value)} />
                        <input type="time" className="p-2 border rounded text-xs" value={exit.time} onChange={(e) => updateExit(i, 'time', e.target.value)} />
                        <input type="number" step="any" placeholder="Price" className="p-2 border rounded text-xs" value={exit.price} onChange={(e) => updateExit(i, 'price', e.target.value)} />
                        <input type="number" placeholder="Size $" className="p-2 border rounded text-xs" value={exit.size} onChange={(e) => updateExit(i, 'size', e.target.value)} />
                        {newTrade.exits.length > 1 && (
                          <button onClick={() => removeExit(i)} className="text-red-500 text-xs">✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Max/Min */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Price (ATH)</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.maxPrice} onChange={(e) => setNewTrade({...newTrade, maxPrice: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Price (ATL)</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.minPrice} onChange={(e) => setNewTrade({...newTrade, minPrice: e.target.value})} />
                    </div>
                  </div>
                  
                  {/* Journal */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-2">📝 Journal (optional)</p>
                    <div className="space-y-2">
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.reason} onChange={(e) => setNewTrade({...newTrade, reason: e.target.value})} placeholder="Why did you take this trade?" />
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.emotions} onChange={(e) => setNewTrade({...newTrade, emotions: e.target.value})} placeholder="Emotions? (fomo, calm, revenge, anxious...)" />
                      <input type="text" className="w-full p-2 border rounded text-sm" value={newTrade.lessons} onChange={(e) => setNewTrade({...newTrade, lessons: e.target.value})} placeholder="Lessons learned?" />
                    </div>
                  </div>
                  
                  <button onClick={addTrade} className="w-full mt-3 bg-green-600 text-white py-2 rounded text-sm">Add Trade</button>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <h4 className="font-semibold mb-2">History ({dailyData[editingDay].trades.length})</h4>
                  {dailyData[editingDay].trades.length === 0 ? (
                    <p className="text-gray-500 text-sm">No trades yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {dailyData[editingDay].trades.map((trade) => (
                        <div key={trade.id} className="border p-3 rounded bg-white text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${trade.tradeType === 'scalp' ? 'bg-blue-100 text-blue-700' : trade.tradeType === 'swing' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                {trade.tradeType}
                              </span>
                              {trade.isDCA && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">DCA</span>}
                              {trade.holdTime && <span className="text-gray-500">({trade.holdTime})</span>}
                            </span>
                            <button onClick={() => deleteTrade(editingDay, trade.id)} className="text-red-600 text-xs">Delete</button>
                          </div>
                          {trade.roundtripped && <div className="text-xs text-red-600 font-semibold">🔄 ROUNDTRIP!</div>}
                          {trade.savedByEarlyExit && <div className="text-xs text-green-600 font-semibold">✅ EARLY EXIT!</div>}
                          
                          {/* Entries */}
                          <div className="text-xs text-gray-500 mt-1">
                            Entries: {trade.entries?.map((e, i) => `$${e.price} (${formatCurrency(e.size)})`).join(' → ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Exits: {trade.exits?.map((e, i) => `$${e.price} (${formatCurrency(e.size)})`).join(' → ')}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-2">
                            <div>Avg Entry: ${trade.avgEntry?.toFixed(6)}</div>
                            <div>Avg Exit: ${trade.avgExit?.toFixed(6)}</div>
                            <div>Size: {formatCurrency(trade.positionSize)}</div>
                            <div className={`font-bold ${trade.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              P&L: {formatCurrency(trade.actualProfit)} ({trade.actualProfitPercent?.toFixed(1)}%)
                            </div>
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
