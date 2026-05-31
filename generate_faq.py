import sqlite3
import json

DB_FILE = "d:/roadwatch_desktop/data/contracts.db"
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

def format_inr(value):
    if not value: return "N/A"
    if value >= 10000000: return f"₹{value / 10000000:.2f} Cr"
    return f"₹{value / 100000:.2f} L"

faqs = []

# Q1: Overall Stats
cursor.execute("SELECT COUNT(*), SUM(contract_value), AVG(contract_value) FROM contracts")
count, total, avg = cursor.fetchone()
faqs.append({
    "question": "What is the overall highway infrastructure investment overview?",
    "answer": "Here is the high-level overview of all highway contracts tracked in the database.",
    "stats": {
        "Total Contracts": str(count),
        "Total Investment": format_inr(total),
        "Average Contract": format_inr(avg)
    }
})

# Q2: Top 10 States
cursor.execute("SELECT state, COUNT(*), SUM(contract_value) as val FROM contracts WHERE state != 'Other' AND state != '' GROUP BY state ORDER BY val DESC LIMIT 10")
rows = cursor.fetchall()
table_rows = [[r[0], str(r[1]), format_inr(r[2])] for r in rows]
faqs.append({
    "question": "Show me the top 10 states by highway investment.",
    "answer": "Here is the breakdown of the top 10 states receiving the highest highway infrastructure investments.",
    "table": {
        "columns": ["State", "Number of Contracts", "Total Value Awarded"],
        "rows": table_rows
    }
})

# Q3: Top 10 Contractors
cursor.execute("SELECT selected_bidder, COUNT(*), SUM(contract_value) as val FROM contracts WHERE selected_bidder != '' GROUP BY selected_bidder ORDER BY val DESC LIMIT 10")
rows = cursor.fetchall()
table_rows = []
for r in rows:
    bidder = r[0]
    if bidder and ',' in bidder:
        bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([bidder, str(r[1]), format_inr(r[2])])

faqs.append({
    "question": "Who are the top 10 highway contractors nationwide?",
    "answer": "These are the top 10 contractors based on total awarded contract value.",
    "table": {
        "columns": ["Contractor", "Contracts Won", "Total Value Awarded"],
        "rows": table_rows
    }
})

# Q4: Largest Contracts
cursor.execute("SELECT tender_ref_no, selected_bidder, state, contract_value FROM contracts ORDER BY contract_value DESC LIMIT 10")
rows = cursor.fetchall()
table_rows = []
for r in rows:
    bidder = r[1]
    if bidder and ',' in bidder:
        bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([r[0][:20]+"...", bidder, r[2] or "N/A", format_inr(r[3])])

faqs.append({
    "question": "What are the top 10 largest individual highway contracts?",
    "answer": "Here are the 10 most massive single highway infrastructure projects awarded.",
    "table": {
        "columns": ["Tender Ref", "Contractor", "State", "Contract Value"],
        "rows": table_rows
    }
})

# Q5: Most Competitive Tenders
cursor.execute("SELECT tender_ref_no, state, bids_received, contract_value FROM contracts WHERE bids_received > 0 ORDER BY bids_received DESC LIMIT 10")
rows = cursor.fetchall()
table_rows = [[r[0][:20]+"...", r[1] or "N/A", str(r[2]), format_inr(r[3])] for r in rows]
faqs.append({
    "question": "Which tenders received the highest number of bids?",
    "answer": "These are the most highly competitive highway tenders, ranked by the number of bids received.",
    "table": {
        "columns": ["Tender Ref", "State", "Bids Received", "Contract Value"],
        "rows": table_rows
    }
})

# Q6: Uttar Pradesh Stats
cursor.execute("SELECT COUNT(*), SUM(contract_value) FROM contracts WHERE state LIKE '%Uttar Pradesh%'")
count, total = cursor.fetchone()
cursor.execute("SELECT selected_bidder, SUM(contract_value) as val FROM contracts WHERE state LIKE '%Uttar Pradesh%' AND selected_bidder != '' GROUP BY selected_bidder ORDER BY val DESC LIMIT 5")
top_bidders = cursor.fetchall()
table_rows = []
for r in top_bidders:
    bidder = r[0]
    if bidder and ',' in bidder: bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([bidder, format_inr(r[1])])

faqs.append({
    "question": "Detailed spending and top contractors in Uttar Pradesh.",
    "answer": f"Uttar Pradesh has {count} contracts totaling {format_inr(total)}. Here are the top contractors in the state:",
    "table": {
        "columns": ["Contractor", "Total Awarded in UP"],
        "rows": table_rows
    }
})

# Q7: Maharashtra Stats
cursor.execute("SELECT COUNT(*), SUM(contract_value) FROM contracts WHERE state LIKE '%Maharashtra%'")
count, total = cursor.fetchone()
cursor.execute("SELECT selected_bidder, SUM(contract_value) as val FROM contracts WHERE state LIKE '%Maharashtra%' AND selected_bidder != '' GROUP BY selected_bidder ORDER BY val DESC LIMIT 5")
top_bidders = cursor.fetchall()
table_rows = []
for r in top_bidders:
    bidder = r[0]
    if bidder and ',' in bidder: bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([bidder, format_inr(r[1])])

faqs.append({
    "question": "Detailed spending and top contractors in Maharashtra.",
    "answer": f"Maharashtra has {count} contracts totaling {format_inr(total)}. Here are the top contractors in the state:",
    "table": {
        "columns": ["Contractor", "Total Awarded in MH"],
        "rows": table_rows
    }
})

# Q8: Contractors by Volume (Number of Contracts)
cursor.execute("SELECT selected_bidder, COUNT(*) as c, SUM(contract_value) FROM contracts WHERE selected_bidder != '' GROUP BY selected_bidder ORDER BY c DESC LIMIT 10")
rows = cursor.fetchall()
table_rows = []
for r in rows:
    bidder = r[0]
    if bidder and ',' in bidder: bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([bidder, str(r[1]), format_inr(r[2])])

faqs.append({
    "question": "Which contractors have won the most individual contracts (volume)?",
    "answer": "These contractors have secured the highest volume of individual highway contracts.",
    "table": {
        "columns": ["Contractor", "Number of Contracts", "Total Value"],
        "rows": table_rows
    }
})

# Q9: Lowest Value Contracts
cursor.execute("SELECT tender_ref_no, state, selected_bidder, contract_value FROM contracts WHERE contract_value > 0 ORDER BY contract_value ASC LIMIT 10")
rows = cursor.fetchall()
table_rows = []
for r in rows:
    bidder = r[2]
    if bidder and ',' in bidder: bidder = bidder.split(',')[0].strip() + " (and others)"
    table_rows.append([r[0][:20]+"...", r[1] or "N/A", bidder or "N/A", format_inr(r[3])])

faqs.append({
    "question": "Show me the smallest/lowest value highway contracts.",
    "answer": "Here are the smallest recorded infrastructure contracts in the registry.",
    "table": {
        "columns": ["Tender Ref", "State", "Contractor", "Contract Value"],
        "rows": table_rows
    }
})

# Q10: Contracts by Year
cursor.execute("SELECT year, COUNT(*), SUM(contract_value) as val FROM contracts WHERE year IS NOT NULL AND year > 2000 GROUP BY year ORDER BY year DESC")
rows = cursor.fetchall()
table_rows = [[str(r[0]), str(r[1]), format_inr(r[2])] for r in rows]
faqs.append({
    "question": "What is the breakdown of highway investments by year?",
    "answer": "This table shows the progression of highway infrastructure spending categorized by year.",
    "table": {
        "columns": ["Year", "Number of Contracts", "Total Value"],
        "rows": table_rows
    }
})

with open("d:/roadwatch_desktop/core/faq_data.py", "w", encoding="utf-8") as f:
    f.write("FAQ_DATA = ")
    f.write(json.dumps(faqs, indent=4))
