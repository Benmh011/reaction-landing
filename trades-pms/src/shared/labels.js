// Shared by the window (as window.Labels) and the PDF builder (via require).
(function (root) {
  const YN = [['yes', 'Yes'], ['no', 'No']];
  const YNNA = [['yes', 'Yes'], ['no', 'No'], ['na', 'N/A']];
  const PFNA = [['pass', 'Pass'], ['fail', 'Fail'], ['na', 'N/A']];

  const L = {
    trades: { gas: 'Gas and heating', plumbing: 'Plumbing', electrical: 'Electrical', building: 'Building' },
    structures: { sole_trader: 'Sole trader', partnership: 'Partnership', limited: 'Limited company' },
    vatSchemes: { standard: 'Standard', cash: 'Standard with cash accounting', flat: 'Flat rate' },
    staggers: { 1: 'March, June, September, December', 2: 'January, April, July, October', 3: 'February, May, August, November' },
    incomeBands: { upto20: '£20,000 or less', '20to30': '£20,001 to £30,000', '30to50': '£30,001 to £50,000', over50: 'More than £50,000' },
    banks: ['Barclays', 'HSBC', 'Lloyds', 'NatWest', 'Santander', 'Nationwide', 'Halifax', 'TSB', 'Metro Bank', 'Co-operative Bank', 'Starling', 'Monzo', 'Tide', 'Other'],
    suppliers: ['Wolseley', 'City Plumbing', 'Plumbase', 'PTS', 'Screwfix', 'Toolstation', 'Travis Perkins', 'Jewson', 'Graham', 'CEF', 'Edmundson', 'Selco', 'BSS'],
    plumbingSchemes: ['APHC', 'CIPHE', 'NAPIT', 'Certass', 'Stroma', 'Other'],
    electricalSchemes: ['NICEIC', 'NAPIT', 'ELECSA', 'Stroma', 'Other'],
    cisRoles: { contractor: 'Contractor (I pay subcontractors)', subcontractor: 'Subcontractor (contractors pay me)', both: 'Both', none: 'Not in CIS' },
    clientTypes: { homeowner: 'Homeowner', landlord: 'Landlord or agent', commercial: 'Business', contractor: 'Contractor' },
    tenures: { owner_occupied: 'Owner occupied', private_rented: 'Private rented', social_rented: 'Social rented' },
    jobStatus: {
      enquiry: 'Enquiry', estimating: 'Estimating', estimate_sent: 'Estimate sent', accepted: 'Accepted', in_progress: 'In progress',
      complete: 'Work complete', invoiced: 'Invoiced', paid: 'Paid', cancelled: 'Cancelled',
    },
    revisionStatus: { draft: 'Not sent', sent: 'Sent', accepted: 'Accepted', superseded: 'Replaced' },
    acceptanceMethods: { signed: 'Signed in person', email: 'Accepted by email', text: 'Accepted by text', phone: 'Accepted by phone', booking: 'Agreed when booked' },
    approvalMethods: { in_person: 'In person', phone: 'By phone', text: 'By text', email: 'By email' },
    paymentMethods: { transfer: 'Bank transfer', card: 'Card', cheque: 'Cheque', cash: 'Cash' },
    expenseCategories: { materials: 'Materials', tools: 'Tools and equipment', vehicle: 'Van and fuel', subcontract: 'Subcontractors', office: 'Phone, office and software', other: 'Other' },
    lineKinds: { material: 'Material', labour: 'Labour' },
    vatRates: [[20, '20%'], [5, '5%'], [0, '0%']],

    certTypes: {
      lgsr: 'Landlord gas safety record',
      service: 'Gas service record',
      warning: 'Gas warning notice',
      commissioning: 'Boiler commissioning record',
    },
    applianceTypes: ['Boiler', 'Combi boiler', 'System boiler', 'Gas fire', 'Hob', 'Cooker', 'Oven', 'Water heater', 'Warm air unit', 'Back boiler', 'Other'],
    flueTypes: [['OF', 'Open flue'], ['RS', 'Room sealed'], ['FL', 'Flueless'], ['FDOF', 'Fanned open flue'], ['na', 'N/A']],

    // One column per appliance on the landlord gas safety record
    lgsrApplianceFields: [
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'appliance_type', label: 'Appliance type', type: 'appliance' },
      { key: 'make', label: 'Make', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'landlord_owned', label: 'Owned by landlord', type: 'select', options: YN },
      { key: 'inspected', label: 'Appliance inspected', type: 'select', options: YN },
      { key: 'flue_type', label: 'Flue type', type: 'flue' },
      { key: 'operating_pressure', label: 'Operating pressure (mbar)', type: 'number' },
      { key: 'heat_input', label: 'Heat input (kW)', type: 'number' },
      { key: 'safety_devices', critical: true, label: 'Safety devices work correctly', type: 'select', options: YNNA },
      { key: 'ventilation', critical: true, label: 'Ventilation satisfactory', type: 'select', options: YNNA },
      { key: 'flue_condition', critical: true, label: 'Flue visual condition satisfactory', type: 'select', options: YNNA },
      { key: 'flue_test', critical: true, label: 'Flue performance test', type: 'select', options: PFNA },
      { key: 'serviced', label: 'Appliance serviced', type: 'select', options: YN },
      { key: 'co_ppm', label: 'CO (ppm)', type: 'number' },
      { key: 'co2_pct', label: 'CO₂ (%)', type: 'number' },
      { key: 'ratio', label: 'CO/CO₂ ratio', type: 'ratio' },
      { key: 'safe_to_use', critical: true, label: 'Safe to use', type: 'select', options: YN },
    ],
    lgsrInstallationChecks: [
      { key: 'tightness', critical: true, label: 'Gas tightness test', options: PFNA },
      { key: 'ecv_access', critical: true, label: 'Emergency control accessible', options: YN },
      { key: 'bonding', critical: true, label: 'Protective equipotential bonding satisfactory', options: YNNA },
      { key: 'co_alarm_fitted', label: 'CO alarm fitted', options: YNNA },
      { key: 'co_alarm_tested', critical: true, label: 'CO alarm tested and working', options: YNNA },
    ],
    serviceChecks: [
      { key: 'burner', label: 'Burner and injector cleaned' },
      { key: 'heat_exchanger', label: 'Heat exchanger checked' },
      { key: 'seals', label: 'Case seals and gaskets checked' },
      { key: 'flue', label: 'Flue and terminal checked' },
      { key: 'controls', label: 'Controls and safety devices checked' },
      { key: 'condensate', label: 'Condensate trap and pipe checked' },
      { key: 'expansion', label: 'Expansion vessel checked' },
      { key: 'pressure', label: 'System pressure checked' },
    ],
    warningClasses: { ID: 'Immediately Dangerous', AR: 'At Risk' },
    warningActions: [
      { key: 'turned_off', label: 'Appliance or installation turned off' },
      { key: 'disconnected', label: 'Disconnected and capped' },
      { key: 'labelled', label: 'Warning label attached' },
      { key: 'esp_notified', label: 'Gas emergency service notified' },
      { key: 'refused', label: 'Customer refused permission to make safe' },
    ],
    commissioningControls: [
      { key: 'time_temp_ch', label: 'Time and temperature control to heating' },
      { key: 'time_temp_hw', label: 'Time and temperature control to hot water' },
      { key: 'trvs', label: 'Thermostatic radiator valves' },
      { key: 'bypass', label: 'Automatic bypass' },
      { key: 'interlock', label: 'Boiler interlock' },
      { key: 'weather_comp', label: 'Weather or load compensation' },
    ],
    waterTreatment: [
      { key: 'flushed', label: 'System flushed' },
      { key: 'cleaner', label: 'Cleaner used' },
      { key: 'inhibitor', label: 'Inhibitor added' },
      { key: 'filter', label: 'Filter fitted' },
    ],
    // ---------- presets for pick lists ----------
    paymentTerms: [[0, 'Due on completion'], [7, '7 days'], [14, '14 days'], [30, '30 days']],
    taxReservePresets: [15, 20, 25, 30],
    // HMRC flat rate percentages, from GOV.UK "VAT Flat Rate Scheme: work out your flat rate".
    // Trade sectors first; the rest follow in HMRC's order. Dated historical rows are left out.
    frsSectors: [
      ['general_building', 'General building or construction services', 9.5, true],
      ['labour_only_building', 'Labour-only building or construction services (materials under 10% of turnover)', 14.5, true],
      ['repair_household', 'Repairing personal or household goods', 10, true],
      ['other_activity', 'Any other activity not listed elsewhere', 12, true],
      ['limited_cost', 'Limited cost business (goods under 2% of turnover or £1,000 a year)', 16.5, true],
      ['accountancy', 'Accountancy or book-keeping', 14.5], ['advertising', 'Advertising', 11], ['agri_services', 'Agricultural services', 11],
      ['architect', 'Architect, civil and structural engineer or surveyor', 14.5], ['animals', 'Boarding or care of animals', 12],
      ['business_services', 'Business services not listed elsewhere', 12], ['catering', 'Catering services including restaurants and takeaways', 12.5],
      ['it_consultancy', 'Computer and IT consultancy or data processing', 14.5], ['computer_repair', 'Computer repair services', 10.5],
      ['entertainment', 'Entertainment or journalism', 12.5], ['estate_agency', 'Estate agency or property management services', 12],
      ['farming', 'Farming or agriculture not listed elsewhere', 6.5], ['film', 'Film, radio, television or video production', 13],
      ['financial', 'Financial services', 13.5], ['forestry', 'Forestry or fishing', 10.5], ['hair_beauty', 'Hairdressing or other beauty treatment services', 13],
      ['hiring', 'Hiring or renting goods', 9.5], ['hotel', 'Hotel or accommodation', 10.5], ['security', 'Investigation or security', 12],
      ['laundry', 'Laundry or dry-cleaning services', 12], ['legal', 'Lawyer or legal services', 14.5], ['cultural', 'Library, archive, museum or other cultural activity', 9.5],
      ['management', 'Management consultancy', 14], ['mfg_metal', 'Manufacturing fabricated metal products', 10.5], ['mfg_food', 'Manufacturing food', 9],
      ['mfg_other', 'Manufacturing not listed elsewhere', 9.5], ['mfg_textiles', 'Manufacturing yarn, textiles or clothing', 9], ['membership', 'Membership organisation', 8],
      ['mining', 'Mining or quarrying', 10], ['packaging', 'Packaging', 9], ['photography', 'Photography', 11], ['post_office', 'Post offices', 5],
      ['printing', 'Printing', 8.5], ['publishing', 'Publishing', 11], ['pubs', 'Pubs', 6.5], ['real_estate', 'Real estate activity not listed elsewhere', 14],
      ['vehicle_repair', 'Repairing vehicles', 8.5], ['retail_food', 'Retailing food, confectionery, tobacco, newspapers or children’s clothing', 4],
      ['retail_pharma', 'Retailing pharmaceuticals, medical goods, cosmetics or toiletries', 8], ['retail_other', 'Retailing not listed elsewhere', 7.5],
      ['retail_vehicles', 'Retailing vehicles or fuel', 6.5], ['secretarial', 'Secretarial services', 13], ['social_work', 'Social work', 11],
      ['sport', 'Sport or recreation', 8.5], ['transport', 'Transport or storage, including couriers, freight, removals and taxis', 10],
      ['travel', 'Travel agency', 10.5], ['vet', 'Veterinary medicine', 11], ['wholesale_agri', 'Wholesaling agricultural products', 8],
      ['wholesale_food', 'Wholesaling food', 7.5], ['wholesale_other', 'Wholesaling not listed elsewhere', 8.5],
    ],
    // Job titles; `cert` marks the certificate the job usually ends with.
    jobTitles: [
      ['Landlord gas safety check', 'lgsr'], ['Boiler service', 'service'], ['Boiler replacement', 'commissioning'], ['New boiler installation', 'commissioning'],
      ['Boiler breakdown', 'service'], ['Gas safety check (homeowner)', 'lgsr'], ['Gas fire service', 'service'], ['Cooker or hob installation', null],
      ['Power flush', null], ['Radiator replacement', null], ['Central heating installation', 'commissioning'], ['Leak repair', null],
      ['Unvented cylinder service', null], ['Bathroom installation', null],
    ],
    defaultPriceList: [
      { description: 'Landlord gas safety check', kind: 'labour' }, { description: 'Boiler service', kind: 'labour' },
      { description: 'Gas safety check (homeowner)', kind: 'labour' }, { description: 'Call-out charge', kind: 'labour' },
      { description: 'Labour (per hour)', kind: 'labour' }, { description: 'Labour (per day)', kind: 'labour' },
      { description: 'Power flush', kind: 'labour' }, { description: 'Magnetic system filter', kind: 'material' },
      { description: 'Inhibitor (1 litre)', kind: 'material' }, { description: 'Carbon monoxide alarm', kind: 'material' },
    ],
    locations: ['Kitchen', 'Utility room', 'Airing cupboard', 'Loft', 'Garage', 'Bathroom', 'Living room', 'Dining room', 'Bedroom', 'Hallway', 'Landing', 'Cellar', 'Outside', 'Boiler room'],
    makes: ['Worcester Bosch', 'Vaillant', 'Baxi', 'Ideal', 'Viessmann', 'Glow-worm', 'Potterton', 'Alpha', 'Intergas', 'Ariston', 'Main', 'Navien', 'Ferroli', 'Vokera', 'Keston', 'Grant',
      'Valor', 'Gazco', 'Flavel', 'Baxi Bermuda', 'Belling', 'Bosch', 'Neff', 'Hotpoint', 'Indesit', 'Leisure', 'Rangemaster', 'Smeg', 'Stoves', 'Zanussi', 'AEG', 'Beko', 'Hoover'],
    changeNotes: ['Client asked for changes', 'Supplier price changed', 'Parts added', 'Parts removed', 'Labour time changed', 'Corrected an error'],
    // Common wording to tick into the free-text boxes on certificates.
    defectPhrases: [
      'No carbon monoxide alarm fitted', 'Carbon monoxide alarm not working', 'Ventilation inadequate for the appliance',
      'Flue not visible along its length for inspection', 'Flue terminal too close to an opening', 'Flue terminal guard missing',
      'Emergency control valve not accessible', 'Main protective equipotential bonding missing', 'Appliance not serviced in the last 12 months',
      'Condensate pipe not insulated against freezing', 'Gas meter not secure or damaged',
    ],
    remedialPhrases: [
      'None required', 'Advised landlord in writing', 'Carbon monoxide alarm fitted and tested', 'Appliance turned off and warning label attached',
      'Gas warning notice issued', 'Ventilation cleared', 'Flue resealed', 'Landlord advised to arrange a service',
    ],
    faultPhrases: {
      ID: ['Gas escape', 'Products of combustion spilling into the room', 'Flue blocked or disconnected', 'Appliance case seal failed on a room-sealed appliance',
        'Inadequate ventilation causing poor combustion', 'Unsafe combustion reading'],
      AR: ['Flue not visible for inspection', 'Ventilation below the required amount', 'No safety device or device not working',
        'Appliance installed in an unsuitable location', 'Flue terminal too close to an opening', 'Gas installation pipework not supported'],
    },
    // CO/CO2 ratio from the two readings: CO (ppm) / (CO2 (%) x 10,000).
    coRatio(coPpm, co2Pct) {
      const co = Number(coPpm), co2 = Number(co2Pct);
      if (!(co >= 0) || !(co2 > 0) || coPpm === '' || coPpm === null || coPpm === undefined) return '';
      return (co / (co2 * 10000)).toFixed(4);
    },
    opt(list, value) {
      const hit = (list || []).find(o => String(o[0]) === String(value));
      return hit ? hit[1] : (value === undefined || value === null || value === '' ? '' : String(value));
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else root.Labels = L;
})(this);
