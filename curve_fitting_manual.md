# Graph Plotting & Curve Fitting - User Manual

## Introduction

Welcome to the **Graph Plotting & Curve Fitting** web application! This tool allows you to input data, visualize it through interactive graphs, and perform various curve fitting analyses to model your data effectively.

## Features

- **Data Input:**
  - Enter your data points manually in the table.
  - Add or remove data rows as needed.
  - Toggle uncertainties (Δx and Δy) with options for absolute or percentage uncertainties.
  - Apply global uncertainties across all data points.

- **Data Import/Export:**
  - Import data from a `.csv` file.
  - Export your data to `.csv` or `.md` (Markdown) formats.

- **Curve Fitting:**
  - Perform basic fits like Linear and Polynomial.
  - Access advanced fitting models such as Exponential, Power, Sinusoidal, Gaussian, and Lorentzian.
  - Customize initial parameters for advanced fitting methods.
  - View fitting equations and R² values.

- **Graph Visualization:**
  - Interactive plots using Plotly.js.
  - Customize graph titles and axis labels with LaTeX formatting.

## Getting Started

### 1. Entering Data

- **Adding Data Points:**
  - Click the **"Add Row"** button to add a new data row.
  - Enter your `x` and `y` values in the respective input fields.
  
- **Removing Data Points:**
  - Click the **"Clear All"** button to remove all data rows.

### 2. Managing Uncertainties

- **Toggling Uncertainties:**
  - Check the **Δx** or **Δy** checkboxes to enable uncertainties for the respective axis.
  
- **Selecting Uncertainty Type:**
  - Choose between **absolute** or **percentage** uncertainties from the dropdown menus.

- **Entering Uncertainties:**
  - Enter the uncertainty values in the input fields that appear once uncertainties are enabled.

- **Applying Global Uncertainties:**
  - Enter a value in the **"Enter Δx"** or **"Enter Δy"** fields and click the corresponding **"Apply Δx"** or **"Apply Δy"** button to apply the uncertainty across all data points.

### 3. Importing and Exporting Data

- **Importing from CSV:**
  - Click the **"Import .csv"** button and select a CSV file from your device.
  - Ensure that the CSV file has at least two columns for `x` and `y`. Additional columns can represent uncertainties.



- **Exporting Data:**
  - Click the **"Export .csv"** button to download your data in CSV format.
  - Click the **"Export .md"** button to download your data in Markdown format, suitable for documentation or reports.

|Note:
|:---
|Certainty levels (absolute or percentage uncertainties) play a crucial role in determining how data is formatted in the exported `.csv` and `.md` files. <p> Formatting rules are applied to ensure that the data maintains consistency and aligns with the provided uncertainties for precise representation in exported files. <p>Here's how they influence the precision:
|1. **Absolute Uncertainties**:
|The number of decimal places (d.p.) in the exported values matches the precision of the absolute uncertainty. <p> - For example, if the uncertainty is `±0.05`, the corresponding data value will be exported with two decimal places, e.g., `5.25 ± 0.05`.
|2. **Percentage Uncertainties**:
|The precision of exported values is adjusted to significant figures (s.f.) based on the percentage uncertainty: <p> - **Small uncertainties (≤ 10%)**: Values are exported with **3 significant figures**. <p> - **Large uncertainties (> 10%)**: Values are exported with **2 significant figures**. <p> - For instance, if the percentage uncertainty is `5%`, a value of `123.456` will be rounded to `123` (3 significant figures), while a `15%` uncertainty will round the same value to `120` (2 significant figures).

### 4. Performing Curve Fitting

- **Basic Fit:**
  - Navigate to the **"Basic Fit"** tab.
  - Select a fitting method (Linear, Polynomial 2nd-4th degree) from the dropdown.
  - Click the **"Fit Curve"** button to perform the fitting.
  - The fitting equation and R² value will be displayed below the graph.

- **Advanced Fit:**
  - Navigate to the **"Advanced Fit"** tab.
  - Select an advanced fitting method (Exponential, Power, Sinusoidal, Gaussian, Lorentzian) from the dropdown.
  - Enter the initial parameters as prompted.
  - Click the **"Fit Curve"** button to perform the fitting.
  - The fitting equation and R² value will be displayed below the graph.

## Tips and Best Practices

- **Data Quality:**
  - Ensure that your data points are accurate and representative of the phenomenon you're modeling.
  
- **Choosing Initial Parameters:**
  - For advanced fitting methods, selecting appropriate initial parameters can significantly impact the convergence and accuracy of the fit.
  
- **Uncertainties:**
  - Use uncertainties to account for measurement errors or variability in your data. Choose between absolute and percentage uncertainties based on your data's nature.

- **LaTeX Formatting:**
  - Utilize LaTeX syntax in labels and titles for clear and professional-looking mathematical expressions.

## Troubleshooting

- **Fitting Did Not Converge:**
  - If a fitting method fails to converge, try adjusting the initial parameters or selecting a different fitting model.

- **Import Errors:**
  - Ensure that your CSV file is properly formatted with headers and consistent columns.

- **LaTeX Rendering Issues:**
  - Verify that your LaTeX syntax is correct. Complex expressions might require additional formatting.


---
