
This program is a **turn-based, quiz-driven variant of Pac-Man** where control is removed from the player and given to autonomous agents (AI) based on the result of an English grammar quiz.

Here is a technical breakdown of the logic for an AI analysis:

### 1. The Core Loop (Finite State Machine)

Instead of continuous real-time gameplay, the program functions as a state machine driven by user input (quiz answers):

-   **`QUIZ` State:** The "Idle" state. Physics and rendering loops continue, but entity movement logic is suspended. The system waits for an input (button click).
    
-   **`RUN` State (Reward):** Triggered by a **Correct Answer**.
    
    -   **Active Agent:** Pac-Man.
        
    -   **Passive Agents:** Ghosts (Frozen).
        
    -   **Duration:** ~2.5 seconds.
        
-   **`FREEZE` State (Punishment):** Triggered by a **Wrong Answer**.
    
    -   **Active Agents:** Ghosts.
        
    -   **Passive Agent:** Pac-Man (Frozen).
        
    -   **Duration:** ~2.5 seconds.
        

### 2. Pac-Man's AI (Greedy Best-First Search)

When the state is `RUN`, Pac-Man moves automatically using a greedy heuristic algorithm:

-   **Decision Point:** Every time Pac-Man centers on a tile (`distToCenter < speed`).
    
-   **Target Selection:** It iterates through the `dots` array to find the **nearest active dot** using Euclidean distance (`Math.hypot`).
    
-   **Pathfinding:**
    
    1.  It identifies valid neighbors (Up, Down, Left, Right).
        
    2.  **Constraints:** It filters out Walls (`1`) and, crucially, **Ghosts** (unless Power Mode is active).
        
    3.  **Heuristic:** It sorts the valid directions based on which one minimizes the distance to the target dot.
        
    4.  **Execution:** It commits to the best direction.
        

### 3. Ghost AI (Chase Heuristic)

When the state is `FREEZE`, Ghosts move automatically using a similar greedy algorithm:

-   **Goal:** Minimize distance to `pacman` coordinates.
    
-   **Behavior:**
    
    1.  At every tile intersection, the ghost calculates the distance from neighbor tiles to Pac-Man.
        
    2.  It sorts directions from closest to furthest.
        
    3.  It adds a 20% randomness factor (`Math.random() < 0.2`) to prevent all ghosts from clustering on the exact same path, giving them slightly organic behavior.
        

### 4. Power Mode (State Modifier)

When Pac-Man eats a specific dot (Type `4`):

-   **Global Flag:** `powerModeTime` is set.
    
-   **Logic Inversion:**
    
    -   **Visuals:** Ghosts render blue/white.
        
    -   **Collision:** Touching a ghost no longer triggers `handleDeath()`; instead, it triggers `handleGhostCollision()` (Ghost reset + Score).
        
    -   **Pathfinding:** Pac-Man's AI stops treating Ghosts as "Walls," allowing him to pathfind directly through them to eat them.
