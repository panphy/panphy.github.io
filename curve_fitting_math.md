# Graph Plotting & Curve Fitting - Fitting Models Documentation

## Introduction

Curve fitting is a statistical tool used to model and analyze the relationship between variables. By fitting a curve to data points, you can describe trends, make predictions, and understand underlying patterns. This document provides an overview of the fitting models available in the **Graph Plotting & Curve Fitting** application, along with explanations of the initial parameters chosen for each model.

## Fitting Models

### 1. Linear Fit

$$ y = mx + c $$

- **Description:** 
  - Models a straight-line relationship between the independent variable $x$ and the dependent variable $y$.
  
- **Initial Parameters:**
  - **Slope ($m$):** Estimated based on the general trend of the data.
  - **Intercept ($c$):** Set to the mean of the $y$-values initially.

- **Reason for Initial Parameters:**
  - Starting with the mean values provides a reasonable baseline for the fitting algorithm, facilitating faster convergence.

### 2. Polynomial Fit

#### General Form:
$$
y = a_nx^n + a_{n-1}x^{n-1} + \dots + a_1x + a_0
$$

- **Description:**
  - Models a nonlinear relationship by introducing higher-degree terms of $x$. Available degrees: 2nd, 3rd, and 4th.
  
- **Initial Parameters:**
  - **Coefficients ($a_n$ to $a_0$):** Initialized to 1 or 0 based on the degree.
  
- **Reason for Initial Parameters:**
  - Starting with simple coefficients helps in iteratively adjusting to fit the data without overcomplicating the initial model.

### 3. Exponential Fit

$$
y = A e^{bx} + c
$$

- **Description:**
  - Models exponential growth or decay. Suitable for data exhibiting rapid increases or decreases.
  
- **Initial Parameters:**
  - **Amplitude ($A$):** Set to 1 as a neutral starting point.
  - **Growth/Decay Rate ($b$):** Initialized to 0.2, representing a moderate rate.
  - **Offset ($c$):** Set to 0 to assume no vertical shift initially.
  
- **Reason for Initial Parameters:**
  - These initial values provide a balance between flexibility and convergence speed, allowing the algorithm to adjust based on the data's behavior.

### 4. Power Fit

$$
y = A x^{b} + c
$$

- **Description:**
  - Models power-law relationships where $y$ scales as a power of $x$. Common in natural phenomena like physics and biology.
  
- **Initial Parameters:**
  - **Coefficient ($A$):** Set to 1 as a starting multiplier.
  - **Exponent ($b$):** Initialized to 1, representing a linear relationship.
  - **Offset ($c$):** Set to 0 assuming no vertical shift.
  
- **Reason for Initial Parameters:**
  - Starting with $b=1$ allows the model to naturally adjust to both increasing and decreasing power relationships based on the data.

### 5. Sinusoidal Fit

$$
y = A e^{bx} \sin(kx - \phi) + c
$$

- **Description:**
  - Models periodic oscillations possibly modulated by exponential growth or decay. Suitable for data with wave-like patterns.
  
- **Initial Parameters:**
  - **Amplitude ($A$):** Set to 1 to start with a standard oscillation magnitude.
  - **Exponential Rate ($b$):** Set to 0, assuming no modulation initially.
  - **Angular Frequency ($k$):** Initialized to 1 to represent a basic oscillation frequency.
  - **Phase Shift ($\phi$):** Set to 0, indicating no initial phase offset.
  - **Offset ($c$):** Set to 0, assuming no vertical shift.
  
- **Reason for Initial Parameters:**
  - These values provide a neutral starting point for the fitting algorithm, allowing it to adjust parameters based on the data's oscillatory nature.

### 6. Gaussian Fit

$$
y = A e^{-\frac{(x - \mu)^2}{2 \sigma^2}} + c
$$

- **Description:**
  - Models a Gaussian (bell-shaped) distribution. Ideal for data representing normal distributions or peak-like structures.
  
- **Initial Parameters:**
  - **Amplitude ($A$):** Set to the maximum $y$-value in the data to represent the peak height.
  - **Mean ($\mu$):** Initialized to the mean of the $x$-values, positioning the center of the peak.
  - **Standard Deviation ($\sigma$):** Set to the standard deviation of the $x$-values to estimate the peak's width.
  - **Offset ($c$):** Set to 0, assuming no vertical shift initially.
  
- **Reason for Initial Parameters:**
  - These initial settings are derived from the data's statistical properties, providing a strong foundation for accurate fitting.

### 7. Lorentzian Fit

$$
y = A \frac{\gamma^2}{(x - x_0)^2 + \gamma^2} + c
$$

- **Description:**
  - Models a Lorentzian (Cauchy) distribution. Commonly used in spectroscopy and resonance phenomena.
  
- **Initial Parameters:**
  - **Amplitude ($A$):** Set to the maximum $y$-value in the data.
  - **Center ($x_0$):** Initialized to the mean of the $x$-values.
  - **Half-Width at Half-Maximum ($\gamma$):** Calculated based on the Full Width at Half Maximum (FWHM) of the data.
  - **Offset ($c$):** Set to 0, assuming no vertical shift.
  
- **Reason for Initial Parameters:**
  - Using data-derived statistics ensures that the Lorentzian fit aligns closely with the data's central tendency and spread from the outset.

## Choosing Initial Parameters

Initial parameters play a crucial role in the convergence and accuracy of the fitting algorithms. Here's why the chosen initial parameters are important:

- **Speed of Convergence:**
  - Good initial guesses reduce the number of iterations required for the algorithm to converge, improving performance.

- **Avoiding Local Minima:**
  - Reasonable initial values help prevent the algorithm from getting trapped in local minima, ensuring a global optimum fit.

- **Adaptability:**
  - Starting with data-derived statistics (like mean and standard deviation) allows the fitting models to adapt more effectively to the data's inherent characteristics.

## Conclusion

Understanding the fitting models and their initial parameters is essential for effective data analysis. By selecting appropriate models and providing informed initial parameters, you can achieve accurate and meaningful fits that enhance your data interpretation.

---
