# Next-Generation Nonogram Solver & Difficulty System

## Goals

This redesign treats three concerns as separate systems:

1. **Exactness**: decide whether a puzzle is solvable and uniquely solvable.
2. **Human difficulty**: estimate how hard the puzzle feels to a human solver.
3. **Enjoyability**: prefer puzzles that reveal an interesting image with a satisfying solving curve.

The current codebase mixes these concerns inside a single solver trace. The new design makes them first-class and independently testable.

## Research Basis

The design is intentionally not constrained by the current implementation. It is based on the strongest ideas from the nonogram and constraint-programming literature:

- **Dynamic-programming line propagation** from Wu, Sun, and Chen (2013), which replaces expensive full-pattern enumeration with line-level DP and supports stronger propagation.
- **Local reasoning with stronger deterministic deductions** from Batenburg and Kosters (2008, 2009), including propagation beyond simple overlap.
- **Human-like difficulty and fun-aware generation** from Batenburg et al. (2009, 2012) and Cazenave et al. (2024/2025), which separate exact solvability from perceived difficulty and enjoyment.
- **Exact oracle backends** inspired by Bosch (2001) and later CP/SAT approaches, so correctness does not depend on the human-like solver.

## Design Principles

- **One exact oracle, one human solver, one generator objective**.
- **Deterministic traces** for every solver used in rating and generation.
- **Rule-level explainability** so difficulty reflects the reasoning actually required.
- **Offline calibration** using generated trace features and real player telemetry.
- **Fun is an explicit objective**, not a side effect of random generation.

## Target Architecture

### 1. Exact Solver Stack

The exact solver is the ground-truth oracle used for uniqueness checking, regression tests, and generator validation.

Planned layers:

1. **DP line analyzer**
   - Input: partial line, clue.
   - Output: satisfiable or not, number of completions up to a cap, forced cells, per-cell possible values, line ambiguity metrics.
   - This is the main propagation primitive.
2. **Constraint propagation engine**
   - Repeatedly applies row and column propagators.
   - Produces contradiction certificates and deterministic propagation traces.
3. **Exact search backend**
   - Branches only when propagation reaches a fixed point.
   - Uses minimum-ambiguity branching, contradiction-first probing, and optional future SAT/CP-SAT backend parity checks.

The exact solver should answer:

- Is the puzzle solvable?
- Is the solution unique?
- What is the exact solution?
- How much ambiguity remains after each propagation pass?

### 2. Human-Like Solver Stack

The human-like solver is separate from the exact solver. It never peeks at the solution and it does not use arbitrary DFS node count as a proxy for human difficulty.

It runs ordered rule families with a full trace:

1. **Trivial completion rules**
   - full-line fill, full-line empty, residual fill/empty count completion.
2. **Overlap / consensus rules**
   - cells forced across all legal placements.
3. **Block-range rules**
   - leftmost/rightmost placement envelopes.
   - segment shrinkage and gap-forcing.
4. **Line interaction rules**
   - applying new row information to columns and vice versa.
5. **Limited probing rules**
   - assume one candidate value for one frontier cell, run deterministic propagation, keep the result only if the opposite assumption contradicts.
6. **Escalation rules for hardest tiers**
   - bounded contradiction chains or bounded-depth speculative reasoning.

Each rule application emits:

- rule id
- touched cells
- inferred cells
- contradiction status
- ambiguity removed
- frontier size before and after

This trace becomes the difficulty model input.

### 3. Difficulty Model

Difficulty is modeled as a function of the human-like trace rather than the exact solver's DFS tree.

Core feature groups:

- **Rule ladder**: strongest rule family needed to finish the puzzle.
- **Trace length**: number of human-reasonable steps.
- **Inference density**: cells solved per step and per rule family.
- **Probe burden**: number of contradiction probes and their depth.
- **Ambiguity profile**: how quickly line ambiguity collapses over time.
- **Revelation curve**: whether the puzzle opens up early, stalls, or resolves in a satisfying late cascade.

Recommended scoring pipeline:

1. Hand-tuned tier model to ship quickly.
2. Offline calibration against telemetry such as solve time, hint rate, abandonment rate, and mistake rate.
3. Optional learned regressor for difficulty prediction once enough labeled play data exists.

### 4. Fun / Enjoyability Model

Difficulty alone is not enough. A hard puzzle can still be boring.

The generator should optimize a separate enjoyability score composed of:

- **Image quality**: recognizable silhouette, low salt-and-pepper noise, balanced connected components.
- **Clue rhythm**: a mix of easy and medium-information lines rather than all-trivial or all-ambiguous clues.
- **Revelation drama**: meaningful cascades after a few strategic deductions.
- **Novelty**: diversity against recent puzzle pool items.
- **Aesthetic priors**: avoid near-duplicate symmetry unless intentionally desired for an easier tier.

### 5. Generator

The generator becomes a search / optimization system over candidate solution grids.

Target objective:

`score(candidate) = uniqueness + target_difficulty_match + enjoyability + diversity - degeneracy_penalties`

Planned search strategies:

- Beam search for deterministic offline pool building.
- MCTS or nested search for high-tier puzzle hunting.
- Multi-start local search seeded from image priors and structured templates.

The generator validates every accepted candidate with the exact oracle and rates it with the human-like solver.

## Module Plan

### Near-Term Modules

- `src/engine/solve-model.ts`
  - shared exact-solver cell model and helpers.
- `src/engine/line-analysis.ts`
  - DP line analyzer returning forced cells and ambiguity metrics.
- `src/engine/solver.ts`
  - exact-solver facade, preserved API.
- `src/engine/human-solver.ts`
  - new human-like rule engine.
- `src/engine/difficulty-v2.ts`
  - trace-based scorer.
- `src/engine/generator-v2.ts`
  - target-driven generator.

### API Direction

```ts
analyzeLine(line, clue): LineAnalysis
solvePuzzleExact(clues, options): ExactSolverResult
solvePuzzleHuman(clues, options): HumanSolverResult
scoreDifficultyV2(trace, metadata): DifficultyAssessment
generatePuzzleV2(request): PuzzleDefinition | null
```

## Migration Strategy

### Slice 1

- Introduce a shared line-analysis module.
- Replace full-pattern overlap logic in the exact solver with DP analysis.
- Preserve the existing public `solvePuzzle()` API.
- Add focused tests for line satisfiability, forced cells, and simple ambiguity metrics.

### Slice 2

- Extract the exact solver into a dedicated propagation-plus-search engine.
- Record ambiguity metrics in the trace.
- Keep current difficulty mapping as a compatibility layer.

### Slice 3

- Add the human-like solver and ordered rule registry.
- Build explainable step traces.
- Add puzzle-level difficulty features derived from those traces.

### Slice 4

- Replace `scoreDifficulty()` with a trace-based rating model.
- Keep legacy tier mapping only as a fallback.

### Slice 5

- Replace random-generate-then-score with target-driven generation.
- Add explicit enjoyability and diversity objectives.

## What Changes First

The first implementation slice will focus on the DP line analyzer. It is the best leverage point because it improves:

- exact solver propagation quality
- future human-like rule implementations
- future generator feature extraction
- explainability of line ambiguity

## References

1. Jan Wolter. *Survey of Paint-by-Number Puzzle Solvers*. 2014. https://webpbn.com/survey/
2. R. Bosch. *Painting by Numbers*. Optima 65, 2001. https://www.mathprog.org/Optima-Issues/optima65.pdf
3. K. J. Batenburg, W. A. Kosters. *A Reasoning Framework for Solving Nonograms*. IWCIA 2008. https://link.springer.com/chapter/10.1007/978-3-540-78275-9_33
4. K. J. Batenburg, W. A. Kosters. *A New Approach to Solving Nonograms by Combining Relaxations*. Pattern Recognition, 2009. https://doi.org/10.1016/j.patcog.2008.08.003
5. K. J. Batenburg, S. Henstra, W. A. Kosters, W. J. Palenstijn. *Constructing Simple Nonograms of Varying Difficulty*. BNAIC 2009. https://liacs.leidenuniv.nl/~kosterswa/constru.pdf
6. K. J. Batenburg et al. *On the Difficulty of Nonograms*. 2012. https://liacs.leidenuniv.nl/~kosterswa/nonodec2012.pdf
7. I.-C. Wu, D. J. Sun, L.-P. Chen. *An Efficient Approach to Solving Nonograms*. IEEE TCIAIG, 2013. https://doi.org/10.1109/TCIAIG.2013.2251884
8. G. Pesant. *A Regular Language Membership Constraint for Finite Sequences of Variables*. CP 2004. https://doi.org/10.1007/978-3-540-30201-8_29
9. T. Hung. *Modeling and Solving the Nonogram Puzzle Using Constraint Programming*. Undergraduate thesis, 2020. https://consystlab.unl.edu/Documents/Theses/Hung-UG-thesis.pdf
10. T. Cazenave et al. *Generating Difficult and Fun Nonograms*. 2024 manuscript / 2025 chapter version. https://www.lamsade.dauphine.fr/~cazenave/papers/Nonogram2024.pdf
