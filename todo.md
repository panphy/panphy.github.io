# To do: PanPhyPlot

## Waiting for a decision
- [ ] The original PanPhyPlot's Power fit (`tools/panphyplot/js/curve-fitting.js`, `performPowerFit`) fits y = A(x − x₀)ᵇ + c. Its four parameters trade off against each other, so it converges poorly on clean data such as the pendulum. The neo-beta now fits y = A xᵇ instead (offsets go in a Custom fit). Changing the original would change the equation its users see, so it waits for the user's go-ahead.
