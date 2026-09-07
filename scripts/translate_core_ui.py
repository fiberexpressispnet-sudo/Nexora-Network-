import re
import os

def update_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    orig = content
    for old, new in replacements:
        content = content.replace(old, new)
    
    if content != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes in {filepath}")

# 1. BandwidthMonitor.tsx
update_file("src/components/BandwidthMonitor.tsx", [
    ("রিয়েল-টাইম ব্যান্ডউইথ ও ট্রাফিক মনিটরিং", "Real-Time Bandwidth & Traffic Monitoring"),
    ("মাইক্রোটিক ইন্টারফেস ট্রাফিক ও ব্যবহার অ্যানালাইটিক্স", "MikroTik Interface Traffic & Usage Analytics"),
    ("লাইভ ডাউনলোড", "Live Download"),
    ("লাইভ আপলোড", "Live Upload"),
    ("পিক ট্রাফিক", "Peak Traffic"),
    ("টোটাল থ্রুপুট", "Total Throughput"),
    ("নেটওয়ার্ক অ্যাক্টিভ কানেকশন", "Active Network Connections"),
    ("রিয়েল-টাইম স্পিড মিটার", "Real-Time Speed Meter"),
    ("ইন্টারফেস ভিত্তিক ট্রাফিক বন্টন", "Interface Traffic Distribution"),
    ("ডাউনলোড", "Download"),
    ("আপলোড", "Upload"),
    ("রিয়েল-টাইম ট্রাফিক গ্রাফ", "Real-Time Traffic Graph"),
    ("ইন্টারফেস পোর্ট স্ট্যাটাস", "Interface Port Status"),
    ("ইন্টারফেস", "Interface"),
    ("টাইপ", "Type"),
    ("ডাউনলোড রেট", "Download Rate"),
    ("আপলোড রেট", "Upload Rate"),
    ("মোট ট্রাফিক", "Total Traffic"),
    ("স্ট্যাটাস", "Status"),
    ("সক্রিয়", "Active"),
    ("নিষ্ক্রিয়", "Inactive"),
])

# 2. BillingModal.tsx
update_file("src/components/flowforge/BillingModal.tsx", [
    ("বিলিং ও পেমেন্ট রেকর্ড", "Billing & Payment Record"),
    ("গ্রাহকের বিল পরিশোধ ও রিসিট জেনারেশন", "Subscriber Bill Payment & Receipt Generation"),
    ("গ্রাহকের নাম:", "Subscriber Name:"),
    ("ইউজার আইডি:", "User ID:"),
    ("বর্তমান প্যাকেজ:", "Current Package:"),
    ("মাসিক বিল:", "Monthly Bill:"),
    ("বকেয়া বিল:", "Due Bill:"),
    ("পেমেন্টের পরিমাণ", "Payment Amount"),
    ("পেমেন্ট মেথড", "Payment Method"),
    ("ক্যাশ (Hand Cash)", "Hand Cash"),
    ("বিকাশ (bKash)", "bKash"),
    ("নগদ (Nagad)", "Nagad"),
    ("রকেট (Rocket)", "Rocket"),
    ("ব্যাংক ট্রান্সফার", "Bank Transfer"),
    ("ট্রানজেকশন আইডি", "Transaction ID"),
    ("নোট বা মন্তব্য", "Note / Remarks"),
    ("বিল পরিশোধ ও রিনিউ করুন", "Collect Payment & Renew"),
    ("পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে!", "Payment recorded successfully!"),
    ("বাতিল", "Cancel"),
])

# 3. MemberLedgerModal.tsx
update_file("src/components/flowforge/MemberLedgerModal.tsx", [
    ("গ্রাহক লেজার স্টেটমেন্ট", "Subscriber Ledger Statement"),
    ("সকল লেনদেন ও বিলিং হিস্ট্রি", "All Transactions & Billing History"),
    ("মোট বিল", "Total Billed"),
    ("মোট পরিশোধ", "Total Paid"),
    ("বর্তমান ব্যালেন্স / বকেয়া", "Current Balance / Due"),
    ("তারিখ", "Date"),
    ("বিবরণ", "Description"),
    ("ডেবিট (বিল)", "Debit (Bill)"),
    ("ক্রেডিট (পেমেন্ট)", "Credit (Payment)"),
    ("ব্যালেন্স", "Balance"),
    ("রিসিট প্রিন্ট", "Print Receipt"),
    ("লেজার প্রিন্ট", "Print Ledger"),
    ("বন্ধ করুন", "Close"),
    ("কোনো লেনদেন রেকর্ড পাওয়া যায়নি", "No transaction records found"),
])

# 4. TownViewModal.tsx
update_file("src/components/flowforge/TownViewModal.tsx", [
    ("জোন / এলাকা ভিত্তিক গ্রাহক ভিউ", "Zone / Area Subscriber View"),
    ("এলাকার মোট ক্লায়েন্ট ও রাজস্ব", "Area Total Subscribers & Revenue"),
    ("মোট গ্রাহক", "Total Clients"),
    ("সক্রিয় সংযোগ", "Active Online"),
    ("মেয়াদোত্তীর্ণ / অফলাইন", "Expired / Offline"),
    ("মাসিক কালেকশন", "Monthly Collection"),
    ("গ্রাহকের তালিকা", "Subscriber List"),
    ("নাম", "Name"),
    ("মোবাইল", "Mobile"),
    ("প্যাকেজ", "Package"),
    ("বিল", "Bill"),
    ("মেয়াদ", "Expiry"),
    ("স্ট্যাটাস", "Status"),
    ("বন্ধ", "Close"),
])

print("Modals updated.")
