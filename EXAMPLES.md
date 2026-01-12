# Example Configurations

This file contains example configurations you can use with the Vivaldi AI Tab Sorter.

## Basic Configuration

### Categories
```
Work, Shopping, Research, Social, Entertainment
```

### Logic Rules
```
Always put YouTube in Entertainment unless the title mentions 'Coding' or 'Tutorial', then put it in Work.
GitHub pages should always go to Work.
Gmail and Google Calendar should go to Work.
```

---

## Developer Configuration

### Categories
```
Code, Documentation, GitHub, Stack Overflow, Testing, DevOps
```

### Logic Rules
```
GitHub repositories go to GitHub.
Stack Overflow and coding forums go to Stack Overflow.
Documentation sites like MDN, DevDocs go to Documentation.
CI/CD tools like Jenkins, GitHub Actions go to DevOps.
Testing frameworks and test reports go to Testing.
Everything else coding-related goes to Code.
```

---

## Student Configuration

### Categories
```
Classes, Research, Assignments, Resources, Entertainment
```

### Logic Rules
```
University websites and LMS (Canvas, Blackboard) go to Classes.
Google Scholar, research papers, and academic articles go to Research.
Assignment submissions and project work go to Assignments.
Educational resources like Khan Academy, Coursera go to Resources.
YouTube and social media go to Entertainment unless related to coursework.
```

---

## Business/Marketing Configuration

### Categories
```
Email, Analytics, Social Media, Content, Clients, Admin
```

### Logic Rules
```
Gmail, Outlook, and email clients go to Email.
Google Analytics, dashboards, and metrics go to Analytics.
Twitter, LinkedIn, Facebook, Instagram go to Social Media.
Content creation tools like Canva, WordPress go to Content.
Client communication and CRM tools go to Clients.
Invoicing, scheduling, and administrative tools go to Admin.
```

---

## Research Configuration

### Categories
```
Primary Sources, Secondary Sources, Data, Analysis, Writing, References
```

### Logic Rules
```
Original research papers and journals go to Primary Sources.
Review articles and books go to Secondary Sources.
Datasets and raw data go to Data.
Statistical tools and analysis software go to Analysis.
Writing tools like Google Docs, Overleaf go to Writing.
Citation managers and reference libraries go to References.
```

---

## E-commerce/Shopping Configuration

### Categories
```
Amazon, Electronics, Clothing, Home, Wishlist, Compare
```

### Logic Rules
```
Amazon links go to Amazon.
Electronics stores like Best Buy, Newegg go to Electronics.
Fashion and clothing sites go to Clothing.
Home improvement and furniture go to Home.
Saved items and wishlists go to Wishlist.
Price comparison and review sites go to Compare.
```

---

## Content Creator Configuration

### Categories
```
Video, Audio, Graphics, Scripts, Publishing, Analytics, Inspiration
```

### Logic Rules
```
YouTube Studio and video editors go to Video.
Audio editing tools and music libraries go to Audio.
Photoshop, Figma, and design tools go to Graphics.
Script writing and planning docs go to Scripts.
Publishing platforms and schedulers go to Publishing.
View counts and engagement metrics go to Analytics.
Inspiration and reference content goes to Inspiration.
```

---

## Tips for Creating Your Own Categories

1. **Keep it Simple**: Start with 3-5 broad categories
2. **Be Specific**: Categories should be mutually exclusive when possible
3. **Match Your Workflow**: Use categories that reflect how you actually work
4. **Test and Iterate**: Try different configurations to find what works best
5. **Use Clear Rules**: The more specific your logic rules, the better the AI performs

## Advanced Logic Rules

### Domain-Based Rules
```
All *.github.com domains go to Work.
All *.google.com domains except YouTube go to Work.
Shopping domains like amazon.com, ebay.com go to Shopping.
```

### Keyword-Based Rules
```
Tabs with "invoice", "payment", "bill" in the title go to Finance.
Tabs with "recipe", "cooking" go to Food.
Tabs with "hotel", "flight", "travel" go to Travel Planning.
```

### Combination Rules
```
YouTube tabs with "music" OR "concert" in title go to Entertainment.
YouTube tabs with "tutorial", "how to", "learn" go to Education.
GitHub tabs for personal repos go to Personal Projects.
GitHub tabs for work repos go to Work.
```

---

## Testing Your Configuration

1. Open 10-20 test tabs with diverse content
2. Run the Analyze & Preview
3. Check if categorization makes sense
4. Adjust categories or rules
5. Re-run analysis
6. Repeat until satisfied

---

## Common Category Sets

**Minimalist (3 categories)**:
- Work, Personal, Entertainment

**Balanced (5 categories)**:
- Work, Shopping, Research, Social, Entertainment

**Power User (7-10 categories)**:
- Work, Email, Code, Documentation, Shopping, Research, Social, Entertainment, News, Finance

**Ultra-Specific (10+ categories)**:
- Create categories for each major project, client, or area of interest
