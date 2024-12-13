# Fitting Methods Explanation

## Introduction

Curve fitting involves finding a mathematical model that best represents the relationship between variables in your data. The **Graph Plotting & Curve Fitting** application offers various fitting methods, each suitable for different types of data. This document explains how the best fit line or curve is obtained for each fitting method, detailing the mathematical foundations and algorithms used.

## 1. Linear Fit

### Model Equation

$$
y = mx + c
$$

### Fitting Method

The linear fit aims to find the slope ($m$) and intercept ($c$) that minimize the sum of the squared differences between the observed values and the values predicted by the model. This method is known as the **Least Squares Method**.

### Process

1. **Compute the Means:**
   - Calculate the mean of the $x$ values ($\overline{x}$) and the mean of the $y$ values ($\overline{y}$).

2. **Calculate the Slope ($m$):**
   $$
   m = \frac{\sum_{i=1}^{n} (x_i - \overline{x})(y_i - \overline{y})}{\sum_{i=1}^{n} (x_i - \overline{x})^2}
   $$

3. **Calculate the Intercept ($c$):**
   $$
   c = \overline{y} - m\overline{x}
   $$

4. **Formulate the Best Fit Line:**
   - Substitute the calculated $m$ and $c$ into the model equation.

### Initial Parameters

- **Slope ($m$):** Initially estimated based on the general trend of the data.
- **Intercept ($c$):** Set to the mean of the $y$-values to provide a starting point for optimization.

### Reason for Initial Parameters

Starting with the mean values provides a balanced initial guess, facilitating faster convergence of the fitting algorithm.

## 2. Polynomial Fit

### Model Equation

For a polynomial of degree $n$:

$$
y = a_nx^n + a_{n-1}x^{n-1} + \dots + a_1x + a_0
$$

### Fitting Method

The polynomial fit extends the linear model by introducing higher-degree terms. The **Least Squares Method** is used to determine the coefficients ($a_n$ to $a_0$) that minimize the sum of squared residuals.

### Process

1. **Construct the Vandermonde Matrix:**
   - For each data point $(x_i, y_i)$, create a row in the matrix with powers of $x_i$ up to degree $n$.

2. **Apply the Least Squares Method:**
   - Solve the normal equations:
     $$
     \mathbf{A}^T\mathbf{A}\mathbf{a} = \mathbf{A}^T\mathbf{y}
     $$
     where $\mathbf{A}$ is the Vandermonde matrix and $\mathbf{a}$ is the vector of coefficients.

3. **Determine the Coefficients:**
   - Use matrix operations to solve for $\mathbf{a}$.

4. **Formulate the Best Fit Polynomial:**
   - Substitute the coefficients into the model equation.

### Initial Parameters

- **Coefficients ($a_n$ to $a_0$):** Initialized to 1 or 0 based on the degree to provide a neutral starting point for optimization.

### Reason for Initial Parameters

Simple initial coefficients help the fitting algorithm adjust iteratively without overcomplicating the model from the outset.

## 3. Exponential Fit

### Model Equation

$$
y = A e^{bx} + c
$$

### Fitting Method

The exponential fit models data that exhibits exponential growth or decay. The **Nonlinear Least Squares Method** is employed to optimize the parameters $A$, $b$, and $c$.

### Process

1. **Define the Residuals:**
   - For each data point, compute the residual:
     $$
     r_i = y_i - (A e^{bx_i} + c)
     $$

2. **Minimize the Sum of Squared Residuals:**
   - Adjust $A$, $b$, and $c$ to minimize:
     $$
     \text{SSE} = \sum_{i=1}^{n} r_i^2
     $$

3. **Optimization Algorithm:**
   - Use iterative algorithms like Gradient Descent or Levenberg-Marquardt to find the optimal parameters.

### Initial Parameters

- **Amplitude ($A$):** Set to 1 as a neutral starting point.
- **Growth/Decay Rate ($b$):** Initialized to 0.2, representing a moderate rate.
- **Offset ($c$):** Set to 0 to assume no vertical shift initially.

### Reason for Initial Parameters

These initial values provide a balance between flexibility and convergence speed, allowing the algorithm to adjust based on the data's behavior.

## 4. Power Fit

### Model Equation

$$
y = A x^{b} + c
$$

### Fitting Method

The power fit models relationships where $y$ scales as a power of $x$. The **Nonlinear Least Squares Method** is used to optimize the parameters $A$, $b$, and $c$.

### Process

1. **Define the Residuals:**
   - For each data point, compute the residual:
     $$
     r_i = y_i - (A x_i^{b} + c)
     $$

2. **Minimize the Sum of Squared Residuals:**
   - Adjust $A$, $b$, and $c$ to minimize:
     $$
     \text{SSE} = \sum_{i=1}^{n} r_i^2
     $$

3. **Optimization Algorithm:**
   - Use iterative algorithms like Gradient Descent or Levenberg-Marquardt to find the optimal parameters.

### Initial Parameters

- **Coefficient ($A$):** Set to 1 as a starting multiplier.
- **Exponent ($b$):** Initialized to 1, representing a linear relationship.
- **Offset ($c$):** Set to 0 assuming no vertical shift.

### Reason for Initial Parameters

Starting with $b=1$ allows the model to naturally adjust to both increasing and decreasing power relationships based on the data.

## 5. Sinusoidal Fit

### Model Equation

$$
y = A e^{bx} \sin(kx - \phi) + c
$$

### Fitting Method

The sinusoidal fit models periodic oscillations, potentially modulated by exponential growth or decay. The **Nonlinear Least Squares Method** is used to optimize the parameters $A$, $b$, $k$, $\phi$, and $c$.

### Process

1. **Define the Residuals:**
   - For each data point, compute the residual:
     $$
     r_i = y_i - (A e^{bx_i} \sin(kx_i - \phi) + c)
     $$

2. **Minimize the Sum of Squared Residuals:**
   - Adjust $A$, $b$, $k$, $\phi$, and $c$ to minimize:
     $$
     \text{SSE} = \sum_{i=1}^{n} r_i^2
     $$

3. **Optimization Algorithm:**
   - Use iterative algorithms like Gradient Descent or Levenberg-Marquardt to find the optimal parameters.

### Initial Parameters

- **Amplitude ($A$):** Set to 1 to start with a standard oscillation magnitude.
- **Exponential Rate ($b$):** Set to 0, assuming no modulation initially.
- **Angular Frequency ($k$):** Initialized to 1 to represent a basic oscillation frequency.
- **Phase Shift ($\phi$):** Set to 0, indicating no initial phase offset.
- **Offset ($c$):** Set to 0, assuming no vertical shift.

### Reason for Initial Parameters

These values provide a neutral starting point for the fitting algorithm, allowing it to adjust parameters based on the data's oscillatory nature.

## 6. Gaussian Fit

### Model Equation

$$
y = A e^{-\frac{(x - \mu)^2}{2 \sigma^2}} + c
$$

### Fitting Method

The Gaussian fit models data that follows a bell-shaped distribution. The **Nonlinear Least Squares Method** is used to optimize the parameters $A$, $\mu$, $\sigma$, and $c$.

### Process

1. **Define the Residuals:**
   - For each data point, compute the residual:
     $$
     r_i = y_i - \left( A e^{-\frac{(x_i - \mu)^2}{2 \sigma^2}} + c \right)
     $$

2. **Minimize the Sum of Squared Residuals:**
   - Adjust $A$, $\mu$, $\sigma$, and $c$ to minimize:
     $$
     \text{SSE} = \sum_{i=1}^{n} r_i^2
     $$

3. **Optimization Algorithm:**
   - Use iterative algorithms like Gradient Descent or Levenberg-Marquardt to find the optimal parameters.

### Initial Parameters

- **Amplitude ($A$):** Set to the maximum $y$-value in the data to represent the peak height.
- **Mean ($\mu$):** Initialized to the mean of the $x$-values, positioning the center of the peak.
- **Standard Deviation ($\sigma$):** Set to the standard deviation of the $x$-values to estimate the peak's width.
- **Offset ($c$):** Set to 0, assuming no vertical shift initially.

### Reason for Initial Parameters

These initial settings are derived from the data's statistical properties, providing a strong foundation for accurate fitting.

## 7. Lorentzian Fit

### Model Equation

$$
y = A \frac{\gamma^2}{(x - x_0)^2 + \gamma^2} + c
$$

### Fitting Method

The Lorentzian fit models data following a Cauchy distribution, commonly used in spectroscopy and resonance phenomena. The **Nonlinear Least Squares Method** is used to optimize the parameters $A$, $x_0$, $\gamma$, and $c$.

### Process

1. **Define the Residuals:**
   - For each data point, compute the residual:
     $$
     r_i = y_i - \left( A \frac{\gamma^2}{(x_i - x_0)^2 + \gamma^2} + c \right)
     $$

2. **Minimize the Sum of Squared Residuals:**
   - Adjust $A$, $x_0$, $\gamma$, and $c$ to minimize:
     $$
     \text{SSE} = \sum_{i=1}^{n} r_i^2
     $$

3. **Optimization Algorithm:**
   - Use iterative algorithms like Gradient Descent or Levenberg-Marquardt to find the optimal parameters.

### Initial Parameters

- **Amplitude ($A$):** Set to the maximum $y$-value in the data.
- **Center ($x_0$):** Initialized to the mean of the $x$-values.
- **Half-Width at Half-Maximum ($\gamma$):** Calculated based on the Full Width at Half Maximum (FWHM) of the data.
- **Offset ($c$):** Set to 0, assuming no vertical shift.

### Reason for Initial Parameters

Using data-derived statistics ensures that the Lorentzian fit aligns closely with the data's central tendency and spread from the outset.

## Conclusion

Understanding the fitting models and their optimization processes is essential for effective data analysis. By selecting the appropriate model and providing informed initial parameters, you can achieve accurate and meaningful fits that enhance your data interpretation.
