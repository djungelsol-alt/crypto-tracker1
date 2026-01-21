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
    entry: '',
    exit: '',
    maxPrice: '',
    minPrice: '',
    positionSize: '',
    openDate: '',
    openTime: '',
    closeDate: '',
    closeTime: '',
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

  const calculateHoldTime = (openDate, openTime, closeDate, closeTime) => {
    if (!openDate || !closeDate) return null;
    const open = new Date(`${openDate}T${openTime || '00:00'}`);
    const close = new Date(`${closeDate}T${closeTime || '00:00'}`);
    const diffMs = close - open;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
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
    const missedProfitPercent = totalPotentialProfit > 0 ? (totalMissedProfit / totalPotentialProfit) * 100 : 0;
    
    const avgPotentialProfitPercent = allTrades.reduce((sum, t) => sum + (t.potentialProfitPercent || 0), 0) / allTrades.length;
    const optimalTakeProfitPercent = avgPotentialProfitPercent * 0.85;

    const losingTrades = allTrades.filter(t => t.actualProfit < 0);
    const avgMaxDrawdown = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + Math.abs(t.maxDrawdown || 0), 0) / losingTrades.length 
      : 0;
    const recommendedStopLoss = Math.min(avgMaxDrawdown * 0.5, 15);
    
    const tradesWithHoldTime = allTrades.filter(t => t.openDate && t.closeDate);
    let avgHoldTimeMs = 0;
    let avgWinHoldTimeMs = 0;
    let avgLossHoldTimeMs = 0;
    
    if (tradesWithHoldTime.length > 0) {
      const holdTimes = tradesWithHoldTime.map(t => {
        const open = new Date(`${t.openDate}T${t.openTime || '00:00'}`);
        const close = new Date(`${t.closeDate}T${t.closeTime || '00:00'}`);
        return { ms: close - open, profit: t.actualProfit };
      });
      
      avgHoldTimeMs = holdTimes.reduce((sum, h) => sum + h.ms, 0) / holdTimes.length;
      
      const winHoldTimes = holdTimes.filter(h => h.profit > 0);
      const lossHoldTimes = holdTimes.filter(h => h.profit < 0);
      
      if (winHoldTimes.length > 0) avgWinHoldTimeMs = winHoldTimes.reduce((sum, h) => sum + h.ms, 0) / winHoldTimes.length;
      if (lossHoldTimes.length > 0) avgLossHoldTimeMs = lossHoldTimes.reduce((sum, h) => sum + h.ms, 0) / lossHoldTimes.length;
    }

    const formatMs = (ms) => {
      if (ms === 0) return 'N/A';
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins}m`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ${mins % 60}m`;
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    };

    const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.actualProfit)) : 0;
    const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.actualProfit)) : 0;

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
      avgHoldTime: formatMs(avgHoldTimeMs),
      avgWinHoldTime: formatMs(avgWinHoldTimeMs),
      avgLossHoldTime: formatMs(avgLossHoldTimeMs),
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
      missedProfitPercent,
      optimalTakeProfitPercent,
      avgMaxDrawdown,
      recommendedStopLoss
    };
  };

  const addTrade = () => {
    if (!newTrade.entry || !newTrade.exit || !newTrade.maxPrice || !newTrade.minPrice || !newTrade.positionSize) return;
    if (editingDay === null) return;
    
    const entry = parseFloat(newTrade.entry);
    const exit = parseFloat(newTrade.exit);
    const maxPrice = parseFloat(newTrade.maxPrice);
    const minPrice = parseFloat(newTrade.minPrice);
    const positionSize = parseFloat(newTrade.positionSize);
    
    const actualProfitPercent = ((exit - entry) / entry) * 100;
    const potentialProfitPercent = ((maxPrice - entry) / entry) * 100;
    const maxDrawdownPercent = ((minPrice - entry) / entry) * 100;
    const missedPercent = maxPrice > exit ? ((maxPrice - exit) / exit) * 100 : 0;
    
    const actualProfit = positionSize * (actualProfitPercent / 100);
    const potentialProfit = positionSize * (potentialProfitPercent / 100);
    const missedProfit = maxPrice > exit ? positionSize * (((maxPrice - exit) / exit) * 100 / 100) : 0;
    
    const wasEverProfitable = maxPrice > entry;
    const savedByEarlyExit = actualProfit > 0 && exit < maxPrice;
    const roundtripped = actualProfit < 0 && wasEverProfitable;

    const holdTime = calculateHoldTime(newTrade.openDate, newTrade.openTime, newTrade.closeDate, newTrade.closeTime);
    
    const trade = {
      id: Date.now(),
      openDate: newTrade.openDate,
      openTime: newTrade.openTime,
      closeDate: newTrade.closeDate,
      closeTime: newTrade.closeTime,
      holdTime,
      entry,
      exit,
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
      reason: newTrade.reason,
      emotions: newTrade.emotions,
      lessons: newTrade.lessons
    };
    
    const newData = [...dailyData];
    newData[editingDay].trades.push(trade);
    
    const dayProfit = newData[editingDay].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    newData[editingDay].profit = dayProfit;
    
    setDailyData(newData);
    setNewTrade({ entry: '', exit: '', maxPrice: '', minPrice: '', positionSize: '', openDate: '', openTime: '', closeDate: '', closeTime: '', reason: '', emotions: '', lessons: '' });
    
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
      <div className="mt-8 space-y-6">
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
                  <div className="text-sm opacity-90">Recommended Stop Loss</div>
                  <div className="text-3xl font-bold">{stats.recommendedStopLoss.toFixed(2)}%</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded">
                <div className="text-sm">Set a hard stop loss at <span className="font-bold text-xl">{stats.recommendedStopLoss.toFixed(2)}%</span> and stick to it.</div>
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
                  <div className="text-xs text-gray-600">Avg Hold Time</div>
                </div>
                <div className="bg-green-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.avgWinHoldTime}</div>
                  <div className="text-xs text-gray-600">Avg Winner Hold</div>
                </div>
                <div className="bg-red-50 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.avgLossHoldTime}</div>
                  <div className="text-xs text-gray-600">Avg Loser Hold</div>
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
                      <div className="text-xs text-gray-600">Calm Win Rate</div>
                      <div className="text-xs text-gray-400">({stats.calmCount} trades)</div>
                    </div>
                  )}
                  {stats.fomoCount > 0 && (
                    <div className="bg-yellow-50 p-4 rounded text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.fomoWinRate}%</div>
                      <div className="text-xs text-gray-600">FOMO Win Rate</div>
                      <div className="text-xs text-gray-400">({stats.fomoCount} trades)</div>
                    </div>
                  )}
                  {stats.revengeCount > 0 && (
                    <div className="bg-red-50 p-4 rounded text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.revengeWinRate}%</div>
                      <div className="text-xs text-gray-600">Revenge Win Rate</div>
                      <div className="text-xs text-gray-400">({stats.revengeCount} trades)</div>
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
            
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
              <div>Hours logged: <span className="font-semibold text-gray-800">{jobStats.totalHours.toFixed(1)}</span></div>
              <div>Days worked: <span className="font-semibold text-gray-800">{jobStats.daysWorked}</span></div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Old annual salary (40hr/week):</div>
              <div className="text-lg font-semibold text-gray-800">{formatCurrency(jobStats.oldYearlyIncome)}</div>
              
              <div className="text-sm text-gray-600 mt-3 mb-1">Trading annual projection:</div>
              <div className={`text-lg font-semibold ${jobStats.tradingAnnualProjection >= jobStats.oldYearlyIncome ? 'text-green-600' : 'text-gray-800'}`}>
                {formatCurrency(jobStats.tradingAnnualProjection)}
              </div>
            </div>
            
            {jobStats.daysToSurpassOldJob !== Infinity && jobStats.daysToSurpassOldJob > 0 && jobStats.totalProfit < jobStats.oldYearlyIncome && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                <div className="text-sm text-gray-700 mb-2">📅 Days to surpass old annual salary:</div>
                <div className="text-3xl font-bold text-purple-600">{jobStats.daysToSurpassOldJob}</div>
              </div>
            )}
            
            {jobStats.totalProfit >= jobStats.oldYearlyIncome && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-400">
                <div className="text-lg font-bold text-green-700 mb-1">🎉 You've surpassed your old salary!</div>
                <div className="text-sm text-green-600">
                  You're now making {formatCurrency(jobStats.totalProfit - jobStats.oldYearlyIncome)} more than your old job.
                </div>
              </div>
            )}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 pt-16 pb-24">
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
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full my-8">
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
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold mb-3">Add Trade</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Open Date</label>
                      <input type="date" className="w-full p-2 border rounded text-sm" value={newTrade.openDate} onChange={(e) => setNewTrade({...newTrade, openDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Open Time</label>
                      <input type="time" className="w-full p-2 border rounded text-sm" value={newTrade.openTime} onChange={(e) => setNewTrade({...newTrade, openTime: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Close Date</label>
                      <input type="date" className="w-full p-2 border rounded text-sm" value={newTrade.closeDate} onChange={(e) => setNewTrade({...newTrade, closeDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Close Time</label>
                      <input type="time" className="w-full p-2 border rounded text-sm" value={newTrade.closeTime} onChange={(e) => setNewTrade({...newTrade, closeTime: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Position Size ($)</label>
                      <input type="number" className="w-full p-2 border rounded text-sm" value={newTrade.positionSize} onChange={(e) => setNewTrade({...newTrade, positionSize: e.target.value})} placeholder="1000" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Entry Price</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.entry} onChange={(e) => setNewTrade({...newTrade, entry: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Exit Price</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.exit} onChange={(e) => setNewTrade({...newTrade, exit: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Price</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.maxPrice} onChange={(e) => setNewTrade({...newTrade, maxPrice: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Price</label>
                      <input type="number" step="any" className="w-full p-2 border rounded text-sm" value={newTrade.minPrice} onChange={(e) => setNewTrade({...newTrade, minPrice: e.target.value})} />
                    </div>
                  </div>
                  
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
                            <span className="font-medium">
                              {trade.openDate} {trade.openTime} → {trade.closeDate} {trade.closeTime}
                              {trade.holdTime && <span className="text-gray-500 ml-2">({trade.holdTime})</span>}
                            </span>
                            <button onClick={() => deleteTrade(editingDay, trade.id)} className="text-red-600 text-xs">Delete</button>
                          </div>
                          {trade.roundtripped && <div className="text-xs text-red-600 font-semibold">🔄 ROUNDTRIP!</div>}
                          {trade.savedByEarlyExit && <div className="text-xs text-green-600 font-semibold">✅ EARLY EXIT!</div>}
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            <div>Entry: ${trade.entry}</div>
                            <div>Exit: ${trade.exit}</div>
                            <div>Size: ${trade.positionSize}</div>
                            <div className={`font-bold ${trade.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              P&L: {formatCurrency(trade.actualProfit)} ({trade.actualProfitPercent.toFixed(1)}%)
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
