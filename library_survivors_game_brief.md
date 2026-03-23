# Library Survivors - Game Brief

## High Concept

**Library Survivors** is a non-violent survivor-like action game inspired by *Vampire Survivors*. The player controls a librarian trying to keep a library under control while increasingly rowdy kids remove books from shelves and scatter them across the map.

Instead of defeating enemies, the player fights **chaos**. Books are picked up automatically when the librarian moves near them, and books are returned automatically when the librarian moves near the correct bookshelf. The goal is to survive for **30 minutes** without the **Chaos Meter** reaching **100%**.

---

## Core Fantasy

The fantasy of the game is not combat. The player is the last line of defense against disorder, noise, and entropy in a library. The fun comes from:
- collecting scattered books,
- intercepting kids before they spread books farther,
- routing efficiently across the map,
- managing inventory and shelving priorities,
- using upgrades to keep pace with escalating chaos.

---

## Win and Lose Conditions

### Win Condition
The player wins the level by surviving for **30 minutes** while keeping the Chaos Meter below **100%**.

### Lose Condition
The game ends immediately when the **Chaos Meter reaches 100%**.

---

## Core Gameplay Loop

1. Kids roam the library and interact with bookshelves.
2. Kids remove books from shelves.
3. Some books are dropped near the shelf, while others are carried far away before being dropped.
4. The librarian moves through the map collecting books automatically from the floor.
5. If the librarian gets close to a kid carrying a book, the librarian can take the book before the kid drops it elsewhere.
6. The librarian returns books automatically when moving near the correct bookshelf.
7. Shelving books grants XP, score, and reduces pressure.
8. As time passes, more kids appear, more books become available to be removed, and chaos becomes harder to contain.
9. The player levels up and chooses upgrades.
10. The loop repeats until the player wins or chaos reaches 100%.

---

## Player Rules

### Movement
- The player directly controls the librarian’s movement.
- Movement is the core interaction and should feel responsive and readable.
- Routing and map navigation are major skill factors.

### Automatic Pickup
- Books on the floor are picked up automatically when the librarian enters pickup range.
- Pickup range can be improved by upgrades.

### Automatic Shelving
- Books are returned automatically when the librarian comes close to the correct bookshelf.
- Shelving speed and effective return radius can be improved through upgrades.

### Inventory / Carry Capacity
- The librarian can carry a limited number of books.
- Base capacity can start small, such as 5 books.
- Capacity upgrades allow the player to hold more books and make longer runs between shelves.

---

## Book and Shelf System

### Shelf Types
Bookshelves should be grouped by category or color so the player can quickly understand where books belong.

Example shelf categories:
- Red: Fiction
- Blue: History
- Green: Science
- Yellow: Children’s Books

### Book Matching
- Each book belongs to one designated shelf type.
- A book is only returned when the librarian reaches the matching bookshelf.
- This creates route planning, inventory management, and prioritization decisions.

### Increasing Available Books Over Time
One of the core difficulty systems is that **more books become available to be taken from shelves over time**.

This means:
- early in the run, only part of the library is vulnerable,
- later, more shelf slots are active,
- eventually, many more books can be removed, causing faster and broader chaos spread.

This helps escalation feel physical and visible, not just numerical.

---

## Kid Behavior

Kids are the main source of disorder. They are not enemies in a combat sense, but active chaos agents.

### Basic Kid Actions
Kids can:
- approach a bookshelf,
- take a book,
- carry a book,
- drop a book either nearby or far away from its designated shelf.

### Near vs Far Disruption
Kids should not always knock books down close to the shelf.

Instead:
- sometimes a kid removes a book and drops it near the bookshelf,
- sometimes a kid grabs a book and carries it to another part of the map before dropping it.

This creates different types of mess:
- **local mess**, which is easier to clean,
- **distributed mess**, which is more dangerous because it stretches the player’s routing.

### Visible Carried Books
The player should be able to clearly see when a kid is carrying a book.

This is important because it:
- creates urgency,
- allows anticipation before a mess lands,
- enables interception gameplay,
- makes chases visually readable and satisfying.

### Interception
If the librarian gets close enough to a kid carrying a book, the librarian can take the book from the kid before it is dropped elsewhere.

This adds a high-value tactical decision:
- chase a kid now and prevent a future mess,
- or ignore them and clean the existing mess.

### Repelled by the Librarian
Kids are repelled by the librarian.

When the librarian gets close:
- kids run away,
- this allows the player to push kids away from shelf-heavy areas,
- it also creates a fun chase dynamic when a kid is fleeing with a book.

This system gives the player crowd-control without violence and supports the fantasy of a stern librarian maintaining order.

### Escalation of Rowdiness
As the run continues:
- kids appear more frequently,
- more kids can be active at the same time,
- kids interact with shelves more often,
- some kids carry books farther before dropping them,
- special kid types may appear with more disruptive behavior.

---

## Chaos Meter

The Chaos Meter is the main fail-state system.

### How Chaos Increases
Chaos rises based primarily on the number of books currently on the floor and not yet returned.

Possible contributing factors:
- total books on the floor,
- how long books remain unshelved,
- how many sections are in visible disarray,
- special events or elite kid behavior.

### Why It Works
This system directly ties the player’s success to maintaining order. The player is not just surviving time — they are actively holding back collapse.

### Desired Feel
- Low mess: chaos rises slowly or stabilizes.
- High mess: chaos rises quickly.
- Critical mess: chaos surges toward failure.

This gives room for recovery while still making the endgame intense.

---

## XP and Leveling

### XP Source
The main source of XP should be **returning books to their correct shelves**.

Optional secondary XP sources:
- intercepting books from kids,
- cleaning a zone quickly,
- surviving event waves,
- maintaining shelving streaks.

### Level-Up Structure
When the player reaches enough XP:
- time pauses briefly,
- the player chooses one of several upgrade options,
- the chosen upgrade permanently improves the run.

### Increasing XP Requirements
With each level gained:
- the XP required for the next level should increase,
- each successive level should be harder to reach,
- progression should feel rewarding early and demanding later.

This makes each new level more valuable and prevents over-leveling too quickly in late-game runs.

---

## Difficulty Scaling Over Time

Difficulty should increase through several overlapping systems.

### 1. More Kids
- more kids spawn as time passes,
- more kids are simultaneously active on the map.

### 2. More Available Books
- more shelf slots become active and removable over time,
- this creates more total possible mess.

### 3. Wider Mess Distribution
- more books get carried away before being dropped,
- the map becomes harder to maintain as disorder spreads geographically.

### 4. Stronger Kid Archetypes
Potential advanced kid types:
- **Wanderer**: basic disruptor,
- **Runner**: carries books quickly across the map,
- **Toss Kid**: throws books farther away,
- **Stack Toppler**: causes multiple books to fall from one shelf,
- **Sneak Kid**: targets remote library corners.

### 5. Higher XP Demands
- each level requires more XP than the previous one,
- the player must work harder to keep scaling.

### 6. Event Pressure
Timed library events can cause spikes in difficulty, such as:
- school group arrives,
- story time rush,
- rainy day indoor crowd,
- return cart spill,
- exam-week chaos.

---

## Player Upgrades

Upgrades should reinforce the librarian fantasy and support different build styles.

### Movement Upgrades
- **Comfy Shoes**: increased move speed
- **Coffee Break**: periodic speed burst
- **Shortcut Map**: faster movement through certain lanes or between sections

### Pickup Upgrades
- **Extendable Grabber**: larger pickup radius
- **Book Magnetism**: nearby books slide toward the player
- **Quick Scoop**: pick up multiple books faster

### Shelving Upgrades
- **Dewey Decimal Mastery**: faster shelving
- **Shelf Whisperer**: larger shelving radius
- **Double Filing**: shelve multiple books more quickly
- **Perfect Filing**: shelving streak bonus XP

### Capacity Upgrades
- **Book Cart**: higher carrying capacity
- **Cargo Cardigan**: extra inventory slots
- **Bottomless Tote**: major rare capacity increase

### Kid-Control Upgrades
- **Shush Pulse**: brief slow or panic effect on nearby kids
- **Stern Glare**: stronger repulsion radius
- **Teacher Voice**: longer or stronger flee response
- **Hall Monitor Badge**: kids hesitate before approaching nearby shelves

### Chaos Control Upgrades
- **Quiet Zone Policy**: slower global chaos gain
- **Neat Freak**: chaos drains slightly faster when floor mess is low
- **PA Announcement**: temporary slowdown of chaos increase
- **After-School Volunteers**: occasional passive cleanup aid

---

## Build Archetypes

These give players different ways to specialize.

### 1. Speed Librarian
Focuses on movement, route coverage, and interception.

### 2. Heavy Hauler
Carries many books and clears large messes efficiently.

### 3. Order Specialist
Maximizes shelving speed, matching efficiency, and combo returns.

### 4. Crowd Controller
Uses repulsion, slowing, and kid manipulation to keep shelves safer.

### 5. Chaos Suppressor
Builds around slowing or reducing chaos growth.

---

## Map Design

The library map should support routing, hotspots, and escalating pressure.

### Recommended Zones
- Children’s Section
- Fiction
- Non-Fiction
- History
- Science
- Study Hall
- Returns Desk
- Archive Corner

### Useful Map Features
- aisles and chokepoints,
- open reading spaces,
- remote corners,
- central hubs,
- shelf clusters,
- shortcuts between sections.

A strong map creates meaningful movement decisions instead of random wandering.

---

## Mid-Run Events

Events help pace the run and create memorable pressure spikes.

Possible events:
- **Field Trip**: temporary surge in kid spawns
- **Story Time Gone Wrong**: one area becomes highly active
- **Book Cart Spill**: many books instantly appear in a section
- **Quiet Reading Hour**: short recovery period with reduced activity
- **Substitute Assistant**: temporary helper NPC
- **Exam Week Rush**: faster disruption for a limited time

---

## Boss-Style Encounters

Bosses can exist as chaos events rather than combat enemies.

Examples:
- **The Twin Tornadoes**: two hyperactive kids causing synchronized disruption
- **Sugar Rush Kid**: extremely fast carrier who spreads books across the map
- **School Tour Wave**: large burst of coordinated disorder
- **Birthday Party Disaster**: many kids active in one area at once

These events can act as milestone difficulty spikes.

---

## Score and Replayability

Although survival is the main goal, a score system adds replay value.

Possible score sources:
- books shelved,
- interception saves,
- clean section bonuses,
- shelving streaks,
- time survived,
- low final chaos percentage.

Possible bonuses:
- **Clean Sweep**: many books collected quickly
- **Section Saver**: restore a section from heavy disorder
- **Last-Minute Recovery**: drop chaos significantly while near failure
- **Perfect Shift**: survive with strong library order maintained

---

## 30-Minute Difficulty Curve

### 0-5 Minutes
- basic kid behavior,
- low active mess,
- player learns shelf types and route patterns.

### 5-10 Minutes
- more books become available,
- more kids active,
- first real interception choices appear.

### 10-15 Minutes
- wider mess distribution,
- more kids flee with books,
- inventory and shelving efficiency matter more.

### 15-20 Minutes
- sections can start to collapse if ignored,
- stronger kid archetypes appear,
- level choices become more strategic.

### 20-25 Minutes
- high pressure across multiple library areas,
- little downtime,
- distributed mess becomes common.

### 25-30 Minutes
- near-constant pressure,
- many books available to be displaced,
- strong kid presence,
- final survival climax.

---

## Prototype Recommendations

For the first playable version, focus on the most essential systems.

### Must-Have Prototype Features
- player movement,
- automatic floor pickup,
- automatic shelving at matching bookshelves,
- limited carry capacity,
- color-coded or category-coded shelves,
- kids that remove books,
- kids that sometimes drop books nearby,
- kids that sometimes carry books far away,
- visible book-carrying kids,
- interception when reaching a kid with a book,
- repulsion behavior when the librarian gets close,
- Chaos Meter,
- XP from shelving,
- level-up choices,
- increasing XP requirements per level,
- more removable books unlocking over time,
- survive-until-timer-complete win condition.

### High-Value Next Features
- shush ability,
- support helper NPC,
- timed events,
- advanced kid types,
- more map zones,
- combo scoring.

---

## Final Design Summary

**Library Survivors** is a survivor-style action-management game where the player controls a librarian trying to keep a library functional against escalating disorder.

The core of the game is:
- pick up books,
- intercept kids carrying books,
- return books to the correct shelves,
- use proximity to repel and corral kids,
- manage spreading mess across the map,
- level up through shelving,
- survive 30 minutes before chaos reaches 100%.

The major systems that define the game are:
- auto pickup,
- auto shelving,
- carry capacity,
- visible kid book-carrying,
- interception,
- kid repulsion,
- increasing available books over time,
- escalating kid behavior,
- rising XP requirements,
- global chaos as the fail state.

This creates a clear and original non-violent survival game loop centered on restoring order under pressure.
