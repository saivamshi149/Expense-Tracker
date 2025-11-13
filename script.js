const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const dateInput = document.getElementById("date");
const filter = document.getElementById("filter");
const showAddBtn = document.getElementById("show-add");
const showHistoryBtn = document.getElementById("show-history");
const formSection = document.getElementById("form-section");
const historySection = document.getElementById("history-section");
const clearHistoryBtn = document.getElementById("clear-history");

// Monthly summary
const monthlyIncomeEl = document.getElementById("monthly-income");
const monthlyExpenseEl = document.getElementById("monthly-expense");
const monthlyBalanceEl = document.getElementById("monthly-balance");

// Previous 3 months
const prevSummaryDiv = document.getElementById("previous-summary");
const monthsGrid = document.getElementById("months-grid");
const togglePrevBtn = document.getElementById("toggle-prev-summary");
const comparisonChartDiv = document.getElementById("comparison-chart");

google.charts.load("current", { packages: ["corechart"] });

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Add Transaction
function addTransaction(e) {
  e.preventDefault();
  let enteredAmount = +amount.value;

  if (category.value === "Salary") {
    enteredAmount = Math.abs(enteredAmount);
  } else {
    enteredAmount = -Math.abs(enteredAmount);
  }

  const transaction = {
    id: Date.now(),
    text: text.value,
    amount: enteredAmount,
    category: category.value,
    date: dateInput.value
  };

  transactions.push(transaction);
  localStorage.setItem("transactions", JSON.stringify(transactions));

  text.value = "";
  amount.value = "";
  dateInput.value = "";

  init();
}

// Remove Transaction
function removeTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  init();
}

// Update Balance, Income, Expense
function updateValues() {
  const amounts = transactions.map((t) => t.amount);
  const total = amounts.reduce((acc, item) => acc + item, 0);
  const income = amounts.filter((item) => item > 0).reduce((acc, item) => acc + item, 0);
  const expense = amounts.filter((item) => item < 0).reduce((acc, item) => acc + item, 0);

  balance.innerText = `₹${total}`;
  money_plus.innerText = `₹${income}`;
  money_minus.innerText = `₹${Math.abs(expense)}`;
}

// Render Transactions
function renderTransactions() {
  list.innerHTML = "";

  let filteredTransactions = [...transactions];
  if (filter.value !== "all") {
    filteredTransactions = filteredTransactions.filter((t) => t.category === filter.value);
  }

  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  filteredTransactions.forEach((transaction) => {
    const sign = transaction.amount > 0 ? "+" : "-";
    const li = document.createElement("li");
    li.classList.add(transaction.amount > 0 ? "plus" : "minus");
    li.innerHTML = `
      ${transaction.category} - ${transaction.text} 
      <span>${sign}₹${Math.abs(transaction.amount)}</span> 
      <small>${transaction.date}</small>
      <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
    `;
    list.appendChild(li);
  });
}

// Current Month Summary
function updateMonthlySummary() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyIncome = 0, monthlyExpense = 0;

  transactions.forEach((t) => {
    const tDate = new Date(t.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
      if (t.amount > 0) {
        monthlyIncome += t.amount;
      } else {
        monthlyExpense += Math.abs(t.amount);
      }
    }
  });

  const monthlyBalance = monthlyIncome - monthlyExpense;

  monthlyIncomeEl.innerText = `Income: ₹${monthlyIncome}`;
  monthlyExpenseEl.innerText = `Expense: ₹${monthlyExpense}`;
  monthlyBalanceEl.innerText = `Balance: ₹${monthlyBalance}`;
}

// Previous 3 Months Summary
function updatePreviousSummaries() {
  monthsGrid.innerHTML = "";
  const now = new Date();
  let comparisonData = [["Month", "Income", "Expense"]];

  for (let i = 1; i <= 3; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = target.toLocaleString("default", { month: "short" });
    const year = target.getFullYear();

    let income = 0, expense = 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate.getMonth() === target.getMonth() && tDate.getFullYear() === target.getFullYear()) {
        if (t.amount > 0) {
          income += t.amount;
        } else {
          expense += Math.abs(t.amount);
        }
      }
    });

    const balance = income - expense;

    // build card
    const card = document.createElement("div");
    card.classList.add("month-card");
    card.innerHTML = `
      <h4>${month} ${year}</h4>
      <p>Income: ₹${income}</p>
      <p>Expense: ₹${expense}</p>
      <p><b>Balance: ₹${balance}</b></p>
      <button class="btn show-chart">Show Chart</button>
      <div class="chart-container" style="display:none;"></div>
    `;

    const btn = card.querySelector(".show-chart");
    const chartContainer = card.querySelector(".chart-container");

    btn.addEventListener("click", () => {
      if (chartContainer.style.display === "none") {
        drawMonthChart(chartContainer, `${month}`, income, expense);
        chartContainer.style.display = "block";
        btn.innerText = "Hide Chart";
      } else {
        chartContainer.style.display = "none";
        btn.innerText = "Show Chart";
      }
    });

    monthsGrid.appendChild(card);

    comparisonData.push([`${month}`, income, expense]);
  }

  // Draw combined chart
  if (comparisonData.length > 1) {
    drawComparisonChart(comparisonData);
  }
}

// Individual month chart
function drawMonthChart(container, month, income, expense) {
  const data = google.visualization.arrayToDataTable([
    ["Type", "Amount", { role: "style" }],
    ["Income", income, "color: #51cf66"],
    ["Expense", expense, "color: #ff6b6b"]
  ]);

  const options = {
    title: `${month} Summary`,
    legend: { position: "none" },
    chartArea: { width: "70%", height: "70%" },
    bar: { groupWidth: "50%" }
  };

  const chart = new google.visualization.ColumnChart(container);
  chart.draw(data, options);
}

// Combined chart for 3 months
function drawComparisonChart(dataArr) {
  const data = google.visualization.arrayToDataTable(dataArr);

  const options = {
    title: "3-Month Comparison",
    chartArea: { width: "70%", height: "70%" },
    bars: "vertical",
    bar: { groupWidth: "70%" },
    vAxis: { title: "Amount" },
    colors: ["#51cf66", "#ff6b6b"]
  };

  const chart = new google.visualization.ColumnChart(comparisonChartDiv);
  chart.draw(data, options);
}

// Expense Breakdown Pie
function drawChart() {
  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.category !== "Salary") {
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = 0;
      }
      categoryTotals[t.category] += Math.abs(t.amount);
    }
  });

  const dataArr = [["Category", "Amount"]];
  for (let cat in categoryTotals) {
    dataArr.push([cat, categoryTotals[cat]]);
  }

  const data = google.visualization.arrayToDataTable(dataArr);

  const options = {
    title: "Expense Breakdown",
    pieHole: 0.4,
    chartArea: { width: "90%", height: "80%" },
  };

  const chart = new google.visualization.PieChart(document.getElementById("chart_div"));
  chart.draw(data, options);
}

// Init
function init() {
  updateValues();
  renderTransactions();
  updateMonthlySummary();
  google.charts.setOnLoadCallback(drawChart);
}

form.addEventListener("submit", addTransaction);
filter.addEventListener("change", renderTransactions);

showAddBtn.addEventListener("click", () => {
  formSection.style.display = "block";
  historySection.style.display = "none";
});

showHistoryBtn.addEventListener("click", () => {
  formSection.style.display = "none";
  historySection.style.display = "block";
});

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all history?")) {
    transactions = [];
    localStorage.removeItem("transactions");
    init();
  }
});

// Toggle previous summaries
togglePrevBtn.addEventListener("click", () => {
  if (prevSummaryDiv.style.display === "none") {
    updatePreviousSummaries();
    prevSummaryDiv.style.display = "block";
    togglePrevBtn.innerText = "Hide Previous 3 Months";
  } else {
    prevSummaryDiv.style.display = "none";
    togglePrevBtn.innerText = "Show Previous 3 Months";
  }
});

init();
``
