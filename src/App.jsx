import { useState } from 'react';

export default function App() {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [oldHourlySalary, setOldHourlySalary] = useState('');
  const [dailyData, setDailyData] = useState(Array(365).fill(null).map(() => ({ 
    profit: 0, 
    hours: 0,
    trades: [] 
  })));
  const [editingDay, setEditingDay] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [tempHours, setTempHours] = useState('');
  const [showWithdrawAlert, setShowWithdrawAlert] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [newTrade, setNewTrade] = useState({
    entry: '',
    exit: '',
    maxPrice: '',
    minPrice: '',
    positionSize: '',
    date: ''
  });

  const addTrade = () => {
    if (!newTrade.entry || !newTrade.exit || !newTrade.maxPrice || !newTrade.minPrice || !newTrade.positionSize) return;
    if (editingDay === null) return;
    
    const entry = parseFloat(newTrade.entry);
    const exit = parseFloat(newTrade.exit);
    const maxPrice = parseFloat(newTrade.maxPrice);
    const minPrice = parseFloat(newTrade.minPrice);
    const positionSize = parseFloat(newTrade.positionSize);
    
    const actualProfit = (exit - entry) * positionSize;
    const potentialProfit = (maxPrice - entry) * positionSize;
    const missedProfit = maxPrice > exit ? (maxPrice - exit) * positionSize : 0;
    const missedPercent = maxPrice > exit ? ((maxPrice - exit) / exit) * 100 : 0;
    
    const actualProfitPercent = ((exit - entry) / entry) * 100;
    const potentialProfitPercent = ((maxPrice - entry) / entry) * 100;
    
    const maxDrawdown = ((minPrice - entry) / entry) * 100;
    const wasEverProfitable = maxPrice > entry;
    
    const savedByEarlyExit = actualProfit > 0 && exit < maxPrice;
    const roundtripped = actualProfit < 0 && wasEverProfitable;
    
    const trade = {
      id: Date.now(),
      date: newTrade.date || new Date().toISOString().split('T')[0],
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
      maxDrawdown,
      wasEverProfitable,
      savedByEarlyExit,
      roundtripped
    };
    
    const newData = [...dailyData];
    newData[editingDay].trades.push(trade);
    
    const dayProfit = newData[editingDay].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    newData[editingDay].profit = dayProfit;
    
    setDailyData(newData);
    setNewTrade({ entry: '', exit: '', maxPrice: '', minPrice: '', positionSize: '', date: '' });
    
    if (dayProfit > 1000) {
      setWithdrawAmount(dayProfit);
      setShowWithdrawAlert(true);
    }
  };

  const deleteTrade = (dayIndex, tradeId) => {
    const newData = [...dailyData];
    newData[dayIndex].trades = newData[dayIndex].trades.filter(t => t.id !== tradeId);
    
    const dayProfit = newData[dayIndex].trades.reduce((sum, t) => sum + t.actualProfit, 0);
    newData[dayIndex].profit = dayProfit;
    
    setDailyData(newData);
  };

  const calculateOptimalTakeProfit = () => {
    const allTrades = dailyData.flatMap(day => day.trades);
    if (allTrades.length === 0) return null;
    
    const totalActualProfit = allTrades.reduce((sum, t) => sum + t.actualProfit, 0);
    const totalPotentialProfit = allTrades.reduce((sum, t) => sum + t.potentialProfit, 0);
    const totalMissedProfit = allTrades.reduce((sum, t) => sum + t.missedProfit, 0);
    
    const avgActualProfitPercent = allTrades.reduce((sum, t) => sum + t.actualProfitPercent, 0) / allTrades.length;
    const avgPotentialProfitPercent = allTrades.reduce((sum, t) => sum + t.potentialProfitPercent, 0) / allTrades.length;
    
    const optimalTakeProfitPercent = avgPotentialProfitPercent * 0.85;
    
    const losingTrades = allTrades.filter(t => t.actualProfit < 0);
    const avgMaxDrawdown = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + Math.abs(t.maxDrawdown), 0) / losingTrades.length 
      : 0;
    
    const recommendedStopLoss = Math.min(avgMaxDrawdown * 0.5, 15);
    
    const profitableAtSomePoint = allTrades.filter(t => t.wasEverProfitable).length;
    const hitRate = (profitableAtSomePoint / allTrades.length) * 100;
    
    return {
      totalActualProfit,
      totalPotentialProfit,
      totalMissedProfit,
      avgActualProfitPercent,
      avgPotentialProfitPercent,
      optimalTakeProfitPercent,
      totalTrades: allTrades.length,
      missedProfitPercent: (totalMissedProfit / totalPotentialProfit) * 100,
      avgMaxDrawdown,
      recommendedStopLoss,
      hitRate,
      profitableAtSomePoint
    };
  };

  const calculateStats = () => {
    const totalProfit = dailyData.reduce((sum, day) => sum + day.profit, 0);
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0);
    const profitableDays = dailyData.filter(day => day.profit > 0).length;
    const losingDays = dailyData.filter(day => day.profit < 0).length;
    
    const avgDailyProfit = totalProfit / 365;
    const effectiveHourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;
    
    const oldYearlyIncome = parseFloat(oldHourlySalary) * 40 * 52;
    const daysOver1k = dailyData.filter(day => day.profit > 1000).length;
    
    const daysWorked = dailyData.filter(day => day.hours > 0).length;
    const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
    
    const hoursPerDayForProjection = Math.max(8, avgHoursPerDay);
    
    const tradingAnnualProjection = effectiveHourlyRate * hoursPerDayForProjection * 365;
    
    const profitNeeded = oldYearlyIncome - totalProfit;
    const dailyEarningsAtCurrentRate = effectiveHourlyRate * hoursPerDayForProjection;
    const daysToSurpassOldJob = dailyEarningsAtCurrentRate > 0 
      ? Math.ceil(profitNeeded / dailyEarningsAtCurrentRate) 
      : Infinity;
    
    return {
      totalProfit,
      totalHours,
      profitableDays,
      losingDays,
      avgDailyProfit,
      effectiveHourlyRate,
      oldYearlyIncome,
      daysOver1k,
      tradingAnnualProjection,
      hoursPerDayForProjection,
      daysToSurpassOldJob,
      daysWorked
    };
  };

  const handleStart = () => {
    if (startDate && oldHourlySalary) {
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
      newData[editingDay] = {
        ...newData[editingDay],
        hours: parseFloat(tempHours) || 0
      };
      setDailyData(newData);
      setEditingDay(null);
      setTempHours('');
      setViewMode('day');
    }
  };

  const getMotivationalQuote = (stats) => {
    if (stats.avgDailyProfit > 1000) {
      return {
        quote: "You're making over $1,000 per day. Let that sink in.",
        subtext: "Most people work a full week to make what you're averaging in a single day. This is real progress."
      };
    } else if (stats.profitableDays > stats.losingDays) {
      return {
        quote: "It's not a race. You're profitable, and that means you're on track.",
        subtext: "More winning days than losing days. You're building something sustainable."
      };
    } else if (stats.totalProfit > 0) {
      return {
        quote: "Progress isn't linear. You're still net positive.",
        subtext: "Every profitable trader has rough patches. What matters is the long-term trend."
      };
    } else {
      return {
        quote: "This is part of the journey. Every master was once a beginner.",
        subtext: "Focus on learning, refining your strategy, and protecting your capital."
      };
    }
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
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
        
        if (day.profit > 1000) {
          cellClass += "bg-emerald-600 shadow-lg";
        } else if (day.profit > 0) {
          cellClass += "bg-green-500";
        } else if (day.profit < 0) {
          cellClass += "bg-red-500";
        } else {
          cellClass += "bg-gray-200";
        }
        
        dayCells.push(
          <div
            key={dayIndex}
            className={cellClass}
            onClick={() => handleDayClick(dayIndex)}
            title={`Day ${dayIndex + 1}: ${formatCurrency(day.profit)} (${day.trades.length} trades)`}
          />
        );
      }
      
      rows.push(
        <div key={row} className="flex justify-center">
          {dayCells}
        </div>
      );
    }
    
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Your 365-Day Trading Journey</h2>
        <div className="flex flex-col gap-1">
          {rows}
        </div>
        
        <div className="flex justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-emerald-600 mr-2 rounded"></div>
            <span className="text-gray-600">$1K+ day</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 mr-2 rounded"></div>
            <span className="text-gray-600">Profitable</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 mr-2 rounded"></div>
            <span className="text-gray-600">Loss</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 mr-2 rounded"></div>
            <span className="text-gray-600">No data</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const stats = calculateStats();
    const quote = getMotivationalQuote(stats);
    const optimal = calculateOptimalTakeProfit();
    
    const salaryComparison = ((stats.effectiveHourlyRate / parseFloat(oldHourlySalary)) * 100 - 100).toFixed(1);
    
    return (
      <div className="mt-8 space-y-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg text-white">
          <div className="text-2xl font-bold mb-2">{quote.quote}</div>
          <div className="text-blue-100 text-sm">{quote.subtext}</div>
        </div>

        {optimal && optimal.totalTrades > 0 && (
          <>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">🛑 Stop Loss Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm opacity-90">Avg Max Drawdown</div>
                  <div className="text-3xl font-bold">{optimal.avgMaxDrawdown.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">Recommended Stop Loss</div>
                  <div className="text-3xl font-bold">{optimal.recommendedStopLoss.toFixed(2)}%</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded mb-4">
                <div className="text-lg font-bold mb-2">⚠️ CUT YOUR LOSSES EARLIER!</div>
                <div className="text-sm">You're averaging {optimal.avgMaxDrawdown.toFixed(2)}% drawdowns on losing trades. This is eating your profits!</div>
                <div className="text-sm mt-2">Set a hard stop loss at <span className="font-bold text-xl">{optimal.recommendedStopLoss.toFixed(2)}%</span> and stick to it.</div>
              </div>
              <div className="text-xs opacity-75">
                Cutting losses at {optimal.recommendedStopLoss.toFixed(2)}% would prevent catastrophic -95% losses and preserve your capital.
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">🎯 Hit Rate Analysis</h2>
              <div className="text-center mb-4">
                <div className="text-6xl font-bold mb-2">{optimal.hitRate.toFixed(1)}%</div>
                <div className="text-lg">Hit Rate</div>
                <div className="text-sm opacity-90 mt-1">({optimal.profitableAtSomePoint} of {optimal.totalTrades} trades were profitable at some point)</div>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded">
                <div className="text-sm mb-2">
                  <strong>This means:</strong> {optimal.hitRate.toFixed(1)}% of your trades went green before you exited.
                </div>
                <div className="text-sm">
                  {optimal.hitRate > 70 ? 
                    "🔥 Excellent! Your entries are solid. Focus on better exits and stop losses." :
                    optimal.hitRate > 50 ?
                    "👍 Good hit rate. Tighten your stop losses to protect wins." :
                    "⚠️ Your entries need work. Consider waiting for better setups."}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-semibold mb-4">💰 Money Left on the Table</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm opacity-90">Total Missed Profit</div>
                  <div className="text-3xl font-bold">{formatCurrency(optimal.totalMissedProfit)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-90">% Left on Table</div>
                  <div className="text-3xl font-bold">{optimal.missedProfitPercent.toFixed(1)}%</div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded mb-4">
                <div className="text-sm opacity-90 mb-2">Your avg take profit: {optimal.avgActualProfitPercent.toFixed(2)}%</div>
                <div className="text-sm opacity-90 mb-2">Avg max reached: {optimal.avgPotentialProfitPercent.toFixed(2)}%</div>
                <div className="text-lg font-bold mt-2">✨ Optimal Take Profit: {optimal.optimalTakeProfitPercent.toFixed(2)}%</div>
                <div className="text-xs mt-1 opacity-75">(85% of avg max to ensure realistic exits)</div>
              </div>
              <div className="text-sm">
                If you had taken profit at optimal levels, you'd have made an additional <span className="font-bold text-lg">{formatCurrency(optimal.totalMissedProfit)}</span>
              </div>
            </div>
          </>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Trading Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Total P&L</div>
              <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totalProfit)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Win Rate</div>
              <div className="text-2xl font-bold text-gray-800">
                {((stats.profitableDays / 365) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Avg Daily Profit</div>
              <div className={`text-xl font-bold ${stats.avgDailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.avgDailyProfit)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Total Trades</div>
              <div className="text-xl font-bold text-gray-800">
                {optimal ? optimal.totalTrades : 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Old Job vs Trading</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Old hourly rate:</span>
              <span className="font-semibold text-gray-800">{formatCurrency(parseFloat(oldHourlySalary))}/hr</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Trading hourly rate:</span>
              <span className={`font-semibold ${stats.effectiveHourlyRate >= parseFloat(oldHourlySalary) ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.effectiveHourlyRate)}/hr
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Difference:</span>
              <span className={`font-bold text-lg ${salaryComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salaryComparison >= 0 ? '+' : ''}{salaryComparison}%
              </span>
            </div>
            
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
              <div>Avg hours per trading day: <span className="font-semibold text-gray-800">{stats.daysWorked > 0 ? (stats.totalHours / stats.daysWorked).toFixed(1) : '0'}</span></div>
              <div className="mt-1">Using <span className="font-semibold text-gray-800">{stats.hoursPerDayForProjection.toFixed(0)}</span> hours/day for projection</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded mt-4">
              <div className="text-sm text-gray-600 mb-1">Old annual salary (40hr/week):</div>
              <div className="text-lg font-semibold text-gray-800">{formatCurrency(stats.oldYearlyIncome)}</div>
              
              <div className="text-sm text-gray-600 mt-3 mb-1">
                Trading annual projection ({stats.hoursPerDayForProjection.toFixed(0)}hr/day):
              </div>
              <div className={`text-lg font-semibold ${stats.tradingAnnualProjection >= stats.oldYearlyIncome ? 'text-green-600' : 'text-gray-800'}`}>
                {formatCurrency(stats.tradingAnnualProjection)}
              </div>
            </div>
            
            {stats.daysToSurpassOldJob !== Infinity && stats.daysToSurpassOldJob > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                <div className="text-sm text-gray-700 mb-2">📅 Days to surpass old annual salary:</div>
                <div className="text-3xl font-bold text-purple-600">{stats.daysToSurpassOldJob}</div>
                <div className="text-xs text-gray-600 mt-2">
                  At {formatCurrency(stats.effectiveHourlyRate)}/hr × {stats.hoursPerDayForProjection.toFixed(0)} hrs/day = {formatCurrency(stats.effectiveHourlyRate * stats.hoursPerDayForProjection)}/day
                </div>
              </div>
            )}
            
            {stats.totalProfit >= stats.oldYearlyIncome && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-400">
                <div className="text-lg font-bold text-green-700 mb-1">🎉 You've already surpassed your old salary!</div>
                <div className="text-sm text-green-600">
                  You're now making {formatCurrency(stats.totalProfit - stats.oldYearlyIncome)} more than your old job annually.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Day Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.profitableDays}</div>
              <div className="text-xs text-gray-600">Profitable Days</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.losingDays}</div>
              <div className="text-xs text-gray-600">Losing Days</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded">
              <div className="text-2xl font-bold text-emerald-600">{stats.daysOver1k}</div>
              <div className="text-xs text-gray-600">$1K+ Days</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleReset = () => {
    setStep(1);
    setStartDate('');
    setOldHourlySalary('');
    setDailyData(Array(365).fill(null).map(() => ({ profit: 0, hours: 0, trades: [] })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 pt-16 pb-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Crypto Trading Journey</h1>
        <p className="text-gray-600 mb-8">Track your progress, celebrate your wins, learn from your losses</p>
        
        {step === 1 ? (
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Let's Get Started</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When did you start trading?
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-md text-gray-800"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What was your old hourly salary? ($)
                </label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-md text-gray-800"
                  value={oldHourlySalary}
                  onChange={(e) => setOldHourlySalary(e.target.value)}
                  placeholder="e.g., 25"
                />
              </div>
              
              <button
                onClick={handleStart}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                disabled={!startDate || !oldHourlySalary}
              >
                Start Tracking
              </button>
            </div>
          </div>
        ) : (
          <>
            {renderDayGrid()}
            {renderStats()}
            <button
              onClick={handleReset}
              className="mt-8 w-full bg-gray-600 text-white py-3 rounded-md hover:bg-gray-700 transition-colors font-semibold"
            >
              Reset Journey
            </button>
          </>
        )}
      </div>

      {showWithdrawAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-8 rounded-lg shadow-2xl max-w-md w-full text-white animate-pulse">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉💰🎉</div>
              <h2 className="text-3xl font-bold mb-4">GREAT JOB!</h2>
              <div className="text-5xl font-bold mb-6">{formatCurrency(withdrawAmount)}</div>
              <div className="bg-white bg-opacity-20 p-6 rounded-lg mb-6">
                <p className="text-xl font-semibold mb-3">
                  📤 WITHDRAW 100% OF THIS PROFIT NOW!
                </p>
                <p className="text-lg">
                  Play with the remainder for the rest of the day
                </p>
              </div>
              <p className="text-sm opacity-90 mb-6">
                Secure your profits. Keep your capital safe. This is discipline.
              </p>
              <button
                onClick={() => setShowWithdrawAlert(false)}
                className="w-full bg-white text-emerald-600 py-3 rounded-md hover:bg-gray-100 transition-colors font-bold text-lg"
              >
                Got it! 💪
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDay !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Day Overview
              </button>
              <button
                onClick={() => setViewMode('trades')}
                className={`px-4 py-2 rounded ${viewMode === 'trades' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Individual Trades
              </button>
            </div>

            {viewMode === 'day' ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Day {editingDay + 1} Overview</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Profit/Loss (Auto-calculated from trades)
                    </label>
                    <div className="w-full p-3 bg-gray-100 rounded-md text-gray-800 font-semibold">
                      {formatCurrency(dailyData[editingDay].profit)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hours Traded
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={tempHours}
                      onChange={(e) => setTempHours(e.target.value)}
                      placeholder="e.g., 8"
                    />
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Total Trades: {dailyData[editingDay].trades.length}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDay}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDay(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">Day {editingDay + 1} - Individual Trades</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-3">Add New Trade</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.date}
                        onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Position Size ($)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.positionSize}
                        onChange={(e) => setNewTrade({...newTrade, positionSize: e.target.value})}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Entry Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.entry}
                        onChange={(e) => setNewTrade({...newTrade, entry: e.target.value})}
                        placeholder="e.g., 50000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Exit Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.exit}
                        onChange={(e) => setNewTrade({...newTrade, exit: e.target.value})}
                        placeholder="e.g., 51000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Price Reached ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.maxPrice}
                        onChange={(e) => setNewTrade({...newTrade, maxPrice: e.target.value})}
                        placeholder="e.g., 52000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Price Reached ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        value={newTrade.minPrice}
                        onChange={(e) => setNewTrade({...newTrade, minPrice: e.target.value})}
                        placeholder="e.g., 49000"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addTrade}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm"
                  >
                    Add Trade
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Trade History ({dailyData[editingDay].trades.length})</h4>
                  {dailyData[editingDay].trades.length === 0 ? (
                    <p className="text-gray-500 text-sm">No trades yet. Add your first trade above.</p>
                  ) : (
                    <div className="space-y-2">
                      {dailyData[editingDay].trades.map((trade) => (
                        <div key={trade.id} className="border border-gray-200 p-3 rounded bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium">{trade.date}</div>
                            <button
                              onClick={() => deleteTrade(editingDay, trade.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                          {trade.roundtripped && (
                            <div className="text-xs text-red-600 font-semibold mb-2">
                              🔄 ROUNDTRIP! Was profitable but ended negative
                            </div>
                          )}
                          {trade.savedByEarlyExit && (
                            <div className="text-xs text-green-600 font-semibold mb-2">
                              ✅ EARLY EXIT SAVED YOU! Exited before reversal
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Entry: ${trade.entry.toFixed(2)}</div>
                            <div>Exit: ${trade.exit.toFixed(2)}</div>
                            <div>Max: ${trade.maxPrice.toFixed(2)}</div>
                            <div>Min: ${trade.minPrice.toFixed(2)}</div>
                            <div className="col-span-2">Size: ${trade.positionSize.toFixed(2)}</div>
                            {trade.tokenSymbol && (
                              <div className="col-span-2 text-blue-600">Token: {trade.tokenSymbol}</div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className={`text-sm font-semibold ${trade.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Profit: {formatCurrency(trade.actualProfit)} ({trade.actualProfitPercent.toFixed(2)}%)
                            </div>
                            {trade.wasEverProfitable && (
                              <div className="text-xs text-blue-600 mt-1">
                                ✓ Was profitable (hit rate counts)
                              </div>
                            )}
                            {trade.actualProfit < 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                📉 Max drawdown: {trade.maxDrawdown.toFixed(2)}%
                              </div>
                            )}
                            {trade.missedProfit > 0 && (
                              <div className="text-xs text-orange-600 mt-1">
                                ⚠️ Left on table: {formatCurrency(trade.missedProfit)} ({trade.missedPercent.toFixed(2)}%)
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setEditingDay(null)}
                  className="mt-4 w-full bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
