// Bambu Lab Print Cost Calculator
class PrintCostCalculator {
  constructor() {
    this.data = {
      "printers": {
        "X1C": {"220V": 1100, "110V": 350, "avgPLA": 105, "avgABS": 150, "avgPETG": 150, "avgPC": 135, "standby": 9},
        "X1E": {"220V": 1350, "110V": 600, "avgPLA": 185, "avgABS": 260, "avgPETG": 260, "avgPC": 230, "standby": 16},
        "P1P": {"220V": 1100, "110V": 350, "avgPLA": 110, "avgABS": 170, "avgPETG": 170, "avgPC": 160, "standby": 5},
        "P1S": {"220V": 1100, "110V": 350, "avgPLA": 105, "avgABS": 140, "avgPETG": 140, "avgPC": 135, "standby": 6},
        "A1": {"220V": 1300, "110V": 350, "avgPLA": 95, "avgABS": 200, "avgPETG": 200, "avgPC": 150, "standby": 5},
        "A1_mini": {"220V": 150, "110V": 150, "avgPLA": 80, "avgABS": 75, "avgPETG": 75, "avgPC": 75, "standby": 7},
        "H2D": {"220V": 2200, "110V": 1320, "avgPLA": 197, "avgABS": 395, "avgPETG": 150, "avgPC": 395, "standby": 26}
      },
      "accessories": {
        "AMS": {"standby": 0.96, "working": 5.78},
        "AMS_lite": {"standby": 0.96, "working": 3.69},
        "AMS_2_Pro": {"standby": 1, "working": 12, "drying": 80},
        "AMS_HT": {"standby": 2.5, "working": 12, "drying": 170}
      },
      "defaults": {
        "electricityRate": 3.50,
        "filamentPricePerKg": 329,
        "voltage": "220V",
        "failureRate": 5,
        "laborRate": 0
      },
      "printerPrices": {
        "X1C": 1400,
        "X1E": 1350,
        "P1P": 699,
        "P1S": 899,
        "A1": 399,
        "A1_mini": 299,
        "H2D": 1999
      }
    };

    this.state = {
      selectedPrinter: '',
      selectedAccessories: new Set(),
      selectedFilament: 'PLA',
      toggles: {
        material: true,
        electricity: true,
        equipment: true,
        labor: true
      }
    };

    this.init();
  }

  init() {
    this.setupPrinterSelect();
    this.setupAccessories();
    this.setupFilamentTypes();
    this.setupInputs();
    this.setupToggles();
    this.setupActions();
    this.calculate();
  }

  setupPrinterSelect() {
    const select = document.getElementById('printerSelect');
    select.innerHTML = '<option value="">Select a printer...</option>';
    
    Object.keys(this.data.printers).forEach(printer => {
      const option = document.createElement('option');
      option.value = printer;
      option.textContent = printer.replace('_', ' ');
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.state.selectedPrinter = e.target.value;
      this.updatePrinterSpecs();
      this.updateDepreciationDefault();
      this.calculate();
    });
  }

  updatePrinterSpecs() {
    const specsDiv = document.getElementById('printerSpecs');
    if (!this.state.selectedPrinter) {
      specsDiv.textContent = 'Select a printer to view specs.';
      specsDiv.className = 'status status--info';
      return;
    }

    const printer = this.data.printers[this.state.selectedPrinter];
    const specs = `Max: ${printer['220V']}W (220V) | Standby: ${printer.standby}W | PLA: ${printer.avgPLA}W | ABS/PETG: ${printer.avgABS}W | PC: ${printer.avgPC}W`;
    specsDiv.textContent = specs;
    specsDiv.className = 'status status--success';
  }

  setupAccessories() {
    const container = document.getElementById('accessoryGroup');
    
    Object.entries(this.data.accessories).forEach(([key, accessory]) => {
      const div = document.createElement('div');
      div.className = 'accessory-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `accessory_${key}`;
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.selectedAccessories.add(key);
        } else {
          this.state.selectedAccessories.delete(key);
        }
        this.calculate();
      });

      const label = document.createElement('label');
      label.htmlFor = `accessory_${key}`;
      label.textContent = key.replace('_', ' ');

      const specs = document.createElement('div');
      specs.className = 'accessory-specs';
      let specText = `Standby: ${accessory.standby}W | Working: ${accessory.working}W`;
      if (accessory.drying) {
        specText += ` | Drying: ${accessory.drying}W`;
      }
      specs.textContent = specText;

      div.appendChild(checkbox);
      div.appendChild(label);
      div.appendChild(specs);
      container.appendChild(div);
    });
  }

  setupFilamentTypes() {
    const container = document.getElementById('filamentTypes');
    const filaments = ['PLA', 'PETG', 'ABS', 'PC'];
    
    filaments.forEach((filament, index) => {
      const div = document.createElement('div');
      div.className = 'filament-option';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'filament';
      radio.id = `filament_${filament}`;
      radio.value = filament;
      radio.checked = index === 0;
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.selectedFilament = e.target.value;
          this.calculate();
        }
      });

      const label = document.createElement('label');
      label.htmlFor = `filament_${filament}`;
      label.textContent = filament;

      div.appendChild(radio);
      div.appendChild(label);
      container.appendChild(div);
    });
  }

  setupInputs() {
    // Set default values
    document.getElementById('filamentPriceInput').value = this.data.defaults.filamentPricePerKg;
    document.getElementById('rateInput').value = this.data.defaults.electricityRate;
    document.getElementById('failureInput').value = this.data.defaults.failureRate;

    // Add event listeners for real-time calculation
    const inputs = [
      'hoursInput', 'minutesInput', 'weightInput', 'filamentPriceInput', 
      'rateInput', 'depreciationInput', 'maintenanceInput', 'failureInput', 'laborInput'
    ];

    inputs.forEach(id => {
      const input = document.getElementById(id);
      input.addEventListener('input', () => this.calculate());
    });
  }

  updateDepreciationDefault() {
    if (!this.state.selectedPrinter) return;
    
    const printerPrice = this.data.printerPrices[this.state.selectedPrinter];
    const defaultDepreciation = (printerPrice / 3000).toFixed(2);
    document.getElementById('depreciationInput').value = defaultDepreciation;
  }

  setupToggles() {
    const toggles = ['toggleMaterial', 'toggleElectricity', 'toggleEquipment', 'toggleLabor'];
    
    toggles.forEach(id => {
      const toggle = document.getElementById(id);
      toggle.addEventListener('change', (e) => {
        const type = id.replace('toggle', '').toLowerCase();
        this.state.toggles[type] = e.target.checked;
        this.updateCostDisplay();
      });
    });
  }

  setupActions() {
    document.getElementById('copyBtn').addEventListener('click', () => this.copySummary());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  calculate() {
    const hours = parseFloat(document.getElementById('hoursInput').value) || 0;
    const minutes = parseFloat(document.getElementById('minutesInput').value) || 0;
    const totalHours = hours + (minutes / 60);
    
    const weight = parseFloat(document.getElementById('weightInput').value) || 0;
    const filamentPrice = parseFloat(document.getElementById('filamentPriceInput').value) || 0;
    const electricityRate = parseFloat(document.getElementById('rateInput').value) || 0;
    const depreciation = parseFloat(document.getElementById('depreciationInput').value) || 0;
    const maintenance = parseFloat(document.getElementById('maintenanceInput').value) || 0;
    const failureRate = parseFloat(document.getElementById('failureInput').value) || 0;
    const laborRate = parseFloat(document.getElementById('laborInput').value) || 0;

    const costs = {
      material: this.calculateMaterialCost(weight, filamentPrice, failureRate),
      electricity: this.calculateElectricityCost(totalHours, electricityRate),
      equipment: depreciation * totalHours,
      maintenance: maintenance * totalHours,
      labor: laborRate * totalHours
    };

    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    this.displayCosts(costs);
  }

  calculateMaterialCost(weight, pricePerKg, failureRate) {
    const baseCost = (weight / 1000) * pricePerKg;
    const wastage = baseCost * (failureRate / 100);
    return baseCost + wastage;
  }

  calculateElectricityCost(hours, rate) {
    if (!this.state.selectedPrinter) return 0;

    const printer = this.data.printers[this.state.selectedPrinter];
    let totalPower = printer[`avg${this.state.selectedFilament}`] || printer.avgPLA;

    // Add accessory power
    this.state.selectedAccessories.forEach(accessory => {
      const accessoryData = this.data.accessories[accessory];
      totalPower += accessoryData.working;
    });

    // Convert watts to kilowatts and calculate cost
    return (totalPower / 1000) * hours * rate;
  }

  displayCosts(costs) {
    const tbody = document.getElementById('costBody');
    tbody.innerHTML = '';

    const costItems = [
      { key: 'material', label: 'Material cost', value: costs.material },
      { key: 'electricity', label: 'Electricity cost', value: costs.electricity },
      { key: 'equipment', label: 'Equipment depreciation', value: costs.equipment },
      { key: 'maintenance', label: 'Maintenance cost', value: costs.maintenance },
      { key: 'labor', label: 'Labor cost', value: costs.labor }
    ];

    costItems.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'cost-row';
      row.dataset.type = item.key;
      
      const labelCell = document.createElement('th');
      labelCell.textContent = item.label;
      labelCell.className = 'text-left py-8';
      
      const valueCell = document.createElement('td');
      valueCell.textContent = `R${item.value.toFixed(2)}`;
      valueCell.className = 'text-right py-8';
      
      row.appendChild(labelCell);
      row.appendChild(valueCell);
      tbody.appendChild(row);
    });

    document.getElementById('totalCost').textContent = `R${costs.total.toFixed(2)}`;
    this.updateCostDisplay();
  }

  updateCostDisplay() {
    const rows = document.querySelectorAll('.cost-row');
    rows.forEach(row => {
      const type = row.dataset.type;
      if (this.state.toggles[type]) {
        row.classList.remove('filtered');
      } else {
        row.classList.add('filtered');
      }
    });
  }

  copySummary() {
    const printer = this.state.selectedPrinter || 'Not selected';
    const accessories = Array.from(this.state.selectedAccessories).join(', ') || 'None';
    const filament = this.state.selectedFilament;
    
    const hours = parseFloat(document.getElementById('hoursInput').value) || 0;
    const minutes = parseFloat(document.getElementById('minutesInput').value) || 0;
    const weight = parseFloat(document.getElementById('weightInput').value) || 0;
    
    const totalCost = document.getElementById('totalCost').textContent;
    
    const summary = `Bambu Lab Print Cost Summary
==============================
Printer: ${printer}
Accessories: ${accessories}
Filament: ${filament}
Print Time: ${hours}h ${minutes}m
Material Used: ${weight}g
Total Cost: ${totalCost}

Generated on ${new Date().toLocaleDateString()}`;

    navigator.clipboard.writeText(summary).then(() => {
      const status = document.getElementById('copyStatus');
      status.textContent = 'Summary copied to clipboard!';
      status.className = 'status status--success';
      status.classList.remove('hidden');
      
      setTimeout(() => {
        status.classList.add('hidden');
      }, 3000);
    }).catch(() => {
      const status = document.getElementById('copyStatus');
      status.textContent = 'Failed to copy summary.';
      status.className = 'status status--error';
      status.classList.remove('hidden');
      
      setTimeout(() => {
        status.classList.add('hidden');
      }, 3000);
    });
  }

  reset() {
    // Reset form values
    document.getElementById('printerSelect').value = '';
    document.getElementById('hoursInput').value = '0';
    document.getElementById('minutesInput').value = '0';
    document.getElementById('weightInput').value = '0';
    document.getElementById('filamentPriceInput').value = this.data.defaults.filamentPricePerKg;
    document.getElementById('rateInput').value = this.data.defaults.electricityRate;
    document.getElementById('depreciationInput').value = '';
    document.getElementById('maintenanceInput').value = '0.20';
    document.getElementById('failureInput').value = this.data.defaults.failureRate;
    document.getElementById('laborInput').value = '0';

    // Reset checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.id.startsWith('accessory_')) {
        cb.checked = false;
      } else if (cb.id.startsWith('toggle')) {
        cb.checked = true;
      }
    });

    // Reset radio buttons
    document.querySelector('input[name="filament"][value="PLA"]').checked = true;

    // Reset state
    this.state.selectedPrinter = '';
    this.state.selectedAccessories.clear();
    this.state.selectedFilament = 'PLA';
    this.state.toggles = {
      material: true,
      electricity: true,
      equipment: true,
      labor: true
    };

    // Update display
    this.updatePrinterSpecs();
    this.calculate();
  }
}

// Initialize the calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PrintCostCalculator();
});