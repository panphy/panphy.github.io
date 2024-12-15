# Curve Fitting Algorithms in the App

This document provides an in-depth explanation of the algorithms employed by the **Graph Plotting & Curve Fitting** application for various curve fitting methods. Understanding these algorithms will help users grasp how the application models data and the underlying computational processes involved.

## Table of Contents

1. [Basic Fit Methods](#basic-fit-methods)
   - [Linear Fit](#linear-fit)
   - [Polynomial Fit](#polynomial-fit)
   - [Exponential Fit](#exponential-fit)
   - [Power Fit](#power-fit)
2. [Advanced Fit Methods](#advanced-fit-methods)
   - [Sinusoidal Fit](#sinusoidal-fit)
   - [Gaussian Fit](#gaussian-fit)
   - [Lorentzian Fit](#lorentzian-fit)
3. [Conclusion](#conclusion)

---

## Basic Fit Methods

Basic fit methods are foundational techniques used to establish a relationship between two variables. These methods typically involve linear algebra and are computationally efficient, making them suitable for a wide range of applications.

### Linear Fit

**Equation:**
$$
y = m x + c
$$

**Algorithm Overview:**

The Linear Fit algorithm aims to find the best-fitting straight line through a set of data points by minimizing the sum of the squared vertical distances (residuals) between the data points and the line.

**Steps Involved:**

1. **Data Collection:**
   - Collect pairs of data points $(x_i, y_i)$.

2. **Compute Means:**
   - Calculate the mean of $(x)$ values: $\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i $.
   - Calculate the mean of $y$ values: $\bar{y} = \frac{1}{n} \sum_{i=1}^{n} y_i $.

3. **Calculate Slope $(m)$:**
$$
m = \frac{\sum_{i=1}^{n} (x_i - \bar{x})(y_i - \bar{y})}{\sum_{i=1}^{n} (x_i - \bar{x})^2}
$$

4. **Calculate Intercept $(c)$:**
$$
c = \bar{y} - m \bar{x}
$$

5. **Result:**
   - The equation $ y = m x + c$ represents the best-fitting line.

**Optimization Technique:**

- **Ordinary Least Squares (OLS):** The Linear Fit uses OLS to minimize the residual sum of squares between observed and predicted values.

### Polynomial Fit

**Equation (General Form of Degree $(d)$):**
$$
y = a_d x^d + a_{d-1} x^{d-1} + \dots + a_1 x + a_0
$$

**Algorithm Overview:**

Polynomial Fit extends the Linear Fit by allowing the relationship between $x$ and $y$ to be modeled as a polynomial of degree $(d)$. This provides more flexibility to fit curved data trends.

**Steps Involved:**

1. **Data Collection:**
   - Gather data points $(x_i, y_i)$.

2. **Construct Design Matrix $(X)$:**
   - For a polynomial of degree $(d)$, construct a matrix where each row is $[x_i^d, x_i^{d-1}, \dots, x_i, 1]$.

3. **Apply Ordinary Least Squares:**
   - Solve for the coefficient vector $\mathbf{a} = [a_d, a_{d-1}, \dots, a_1, a_0]^T$ using:
$$
\mathbf{a} = (X^T X)^{-1} X^T \mathbf{y}
$$
where $\mathbf{y}$ is the vector of $y_i$ values.

4. **Result:**
   - The polynomial equation represents the best-fitting curve.

**Optimization Technique:**

- **Matrix-Based OLS:** Utilizes linear algebra to solve for the polynomial coefficients that minimize the residual sum of squares.

### Exponential Fit

**Equation:**
$$
y = A e^{b x}
$$

**Algorithm Overview:**

The Exponential Fit models data where the dependent variable $y$ changes exponentially with the independent variable $x$. The algorithm linearizes the data to apply linear regression techniques.

**Steps Involved:**

1. **Data Collection:**
   - Collect data points $(x_i, y_i)$ with $y_i > 0$.

2. **Linearization:**
   - Take the natural logarithm of both sides:
$$
\ln y = \ln A + b x
$$
Letting $Y = \ln y$ and $C = \ln A$, the equation becomes:
$$
Y = b x + C
$$

3. **Apply Linear Fit:**
   - Perform Linear Fit on $(x_i, Y_i)$ to find slope $b$ and intercept $C$.

4. **Determine Parameters:**
   - $A = e^C$

5. **Result:**
   - The equation $y = A e^{b x}$ represents the best-fitting exponential curve.

**Optimization Technique:**

- **Linear Regression on Transformed Data:** The algorithm applies OLS to the linearized data to find the best-fitting parameters.

### Power Fit

**Equation:**
$$
y = A x^{b}
$$

**Algorithm Overview:**

The Power Fit models a multiplicative relationship where $y$ varies as a power of $x$. Similar to the Exponential Fit, it linearizes the data to utilize linear regression.

**Steps Involved:**

1. **Data Collection:**
   - Gather data points $(x_i, y_i)$ with $x_i > 0$ and $y_i > 0$.

2. **Linearization:**
   - Take the natural logarithm of both sides:
$$
\ln y = \ln A + b \ln x
$$
Letting $Y = \ln y$ and $X = \ln x$, the equation becomes:
$$
Y = b X + C
$$
where $C = \ln A$.

3. **Apply Linear Fit:**
   - Perform Linear Fit on \((X_i, Y_i)\) to determine slope \(b\) and intercept \(C\).

4. **Determine Parameters:**
   - $A = e^C$

5. **Result:**
   - The equation $y = A x^{b}$ represents the best-fitting power curve.

**Optimization Technique:**

- **Linear Regression on Log-Transformed Data:** By transforming the power relationship into a linear form, OLS is applied to estimate the parameters.

---

## Advanced Fit Methods

Advanced fit methods are designed to model more complex data relationships that basic methods cannot accurately capture. These methods often involve iterative optimization techniques such as gradient descent to minimize error functions.

### Sinusoidal Fit

**Equation:**
$$
y = A e^{b x} \sin(k x - \phi) + c
$$

**Algorithm Overview:**

The Sinusoidal Fit combines exponential growth or decay with a sinusoidal oscillation. This method is particularly useful for modeling damped oscillations or wave-like phenomena with underlying trends.

**Steps Involved:**

1. **Data Collection:**
   - Collect data points $(x_i, y_i)$.

2. **Initialize Parameters:**
   - Set initial guesses for $A$, $b$, $k$, $\phi$, and $c$.

3. **Define the Error Function:**
   - Use Mean Squared Error (MSE):
$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \left( A e^{b x_i} \sin(k x_i - \phi) + c \right) \right)^2
$$

4. **Gradient Descent Optimization:**
   - **Compute Partial Derivatives:**
     - Calculate the gradient of MSE with respect to each parameter.
   - **Update Parameters:**
     - Adjust parameters in the opposite direction of the gradient scaled by the learning rate.
$$
\theta_{\text{new}} = \theta_{\text{old}} - \alpha \frac{\partial \text{MSE}}{\partial \theta}
$$
where $\theta$ represents each parameter and $\alpha$ is the learning rate.
   - **Iterate:**
     - Repeat the process until convergence criteria are met (e.g., minimal change in MSE or maximum iterations reached).

5. **Convergence Check:**
   - If the change in MSE between iterations is below a predefined tolerance, terminate the algorithm.

6. **Result:**
   - The optimized parameters $A$, $b$, $k$, $\phi$, and $c$ define the best-fitting sinusoidal curve.

**Optimization Technique:**

- **Gradient Descent:** An iterative optimization algorithm that updates parameters to minimize the error function by moving in the direction opposite to the gradient.

### Gaussian Fit

**Equation:**
$$
y = A e^{-\frac{(x - \mu)^2}{2 \sigma^2}} + c
$$

**Algorithm Overview:**

The Gaussian Fit models data using a Gaussian (bell-shaped) function, which is ideal for representing single-peaked data distributions. This method is widely used in fields like statistics, spectroscopy, and signal processing.

**Steps Involved:**

1. **Data Collection:**
   - Gather data points $(x_i, y_i)$.

2. **Initialize Parameters:**
   - Set initial guesses for $A$, $\mu$, $\sigma$, and $c$.

3. **Define the Error Function:**
   - Use Mean Squared Error (MSE):
$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \left( A e^{-\frac{(x_i - \mu)^2}{2 \sigma^2}} + c \right) \right)^2
$$

4. **Gradient Descent Optimization:**
   - **Compute Partial Derivatives:**
     - Calculate gradients of MSE with respect to $A$, $\mu$, $\sigma$, and $c$.
   - **Update Parameters:**
     - Adjust parameters using the gradients and learning rate.
   - **Iterate:**
     - Continue until the algorithm converges based on tolerance criteria.

5. **Convergence Check:**
   - Terminate when the change in MSE is below a specified threshold or when the maximum number of iterations is reached.

6. **Result:**
   - The optimized parameters $A$, $\mu$, $\sigma$, and $c$ define the best-fitting Gaussian curve.

**Optimization Technique:**

- **Gradient Descent:** Similar to the Sinusoidal Fit, it iteratively updates parameters to minimize the MSE by following the gradient.

### Lorentzian Fit

**Equation:**
$$
y = A \frac{\gamma^2}{(x - x_0)^2 + \gamma^2} + c
$$

**Algorithm Overview:**

The Lorentzian Fit models data using a Lorentzian function, which is suitable for representing resonance phenomena with sharp peaks. It is commonly used in spectroscopy and physics to describe spectral lines and resonant frequencies.

**Steps Involved:**

1. **Data Collection:**
   - Collect data points $(x_i, y_i)$.

2. **Initialize Parameters:**
   - Set initial guesses for $A$, $x_0$, $\gamma$, and $c$.

3. **Define the Error Function:**
   - Use Mean Squared Error (MSE):
$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \left( A \frac{\gamma^2}{(x_i - x_0)^2 + \gamma^2} + c \right) \right)^2
$$

4. **Gradient Descent Optimization:**
   - **Compute Partial Derivatives:**
     - Calculate gradients of MSE with respect to $A$, $x_0$, $\gamma$, and $c$.
   - **Update Parameters:**
     - Adjust parameters based on the gradients and learning rate.
   - **Iterate:**
     - Repeat until convergence is achieved according to the tolerance criteria.

5. **Convergence Check:**
   - Stop the algorithm when the improvement in MSE is negligible or when the maximum number of iterations is reached.

6. **Result:**
   - The optimized parameters $A$, $x_0$, $\gamma$, and $c$ define the best-fitting Lorentzian curve.

**Optimization Technique:**

- **Gradient Descent:** Utilizes the gradients of the MSE with respect to each parameter to iteratively refine the fit.

---

## Conclusion

The **Graph Plotting & Curve Fitting** application leverages a combination of linear algebra and iterative optimization algorithms to provide versatile and accurate curve fitting capabilities. 

- **Basic Fit Methods** such as Linear, Polynomial, Exponential, and Power fits primarily rely on **Ordinary Least Squares (OLS)** and **linear regression** techniques, offering computational efficiency and simplicity for a wide range of data trends.

- **Advanced Fit Methods** including Sinusoidal, Gaussian, and Lorentzian fits employ **Gradient Descent**, an iterative optimization algorithm, to handle more complex and non-linear data relationships. These methods allow for precise modeling of phenomena that exhibit oscillatory behavior, single-peaked distributions, or sharp resonance characteristics.

Understanding the underlying algorithms enhances the user's ability to select the appropriate fit method based on the nature of their data and the specific requirements of their analysis.
