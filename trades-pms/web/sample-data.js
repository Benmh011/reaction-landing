'use strict';
// Web demo only: fills an empty account with made-up work, so the screens can
// be looked at with something in them. Nothing here is special-cased: every
// record goes in through the same actions the screens use (window.tpms.call),
// so the app's own rules, numbering, VAT handling and due dates all apply.
//
// Dates are counted back from today, so the sample always has something
// overdue, something due soon and something just finished, whenever it is loaded.
// Every name, address, phone number and email is invented.
window.TpmsSample = (() => {
  const api = (...a) => UI.api(...a);
  const today = UI.today();
  const day = n => UI.addDaysIso(today, n);
  // The date a check must have been done on for its next one to fall due n days from today.
  const dueIn = n => {
    const [y, m, d] = day(n).split('-').map(Number);
    return new Date(Date.UTC(y - 1, m - 1, d)).toISOString().slice(0, 10);
  };

  // A scribble that stands in for a signature. The same name always draws the same line.
  function signature(name) {
    const c = document.createElement('canvas');
    c.width = 360; c.height = 110;
    const g = c.getContext('2d');
    g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#17202A';
    let seed = [...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 2147483647, 7);
    const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    g.beginPath();
    let x = 26, y = 62;
    g.moveTo(x, y);
    for (let i = 0; i < 16; i++) {
      const nx = x + 10 + rnd() * 14;
      const ny = 30 + rnd() * 52;
      g.quadraticCurveTo(x + (nx - x) / 2, i % 2 ? 96 - rnd() * 20 : 12 + rnd() * 20, nx, ny);
      x = nx; y = ny;
    }
    g.stroke();
    g.beginPath(); g.moveTo(22, 92); g.quadraticCurveTo(170, 84 + rnd() * 10, x + 22, 90); g.stroke();
    return c.toDataURL('image/png');
  }

  // Two of the made-up clients mark an account that already has the sample in it.
  const MARKERS = ['Quayside Lettings', 'The Old Bakery Café'];
  async function loaded() {
    const names = (await api('listClients')).map(c => c.name);
    return MARKERS.every(m => names.includes(m));
  }

  async function load() {
    if (await loaded()) throw new Error('The sample data is already in this account.');
    const account = await api('getAccount');
    const b = await api('getBusiness');
    const gas = account.trades.includes('gas');
    const vat = !!b.vat_registered;
    const engineer = b.engineer_name || account.owner_name;
    const mine = signature(engineer);
    const P = pounds => Math.round(pounds * 100);

    const client = d => api('saveClient', d);
    const property = d => api('saveProperty', d);
    const asset = d => api('saveAsset', d);

    // ---------- clients, their properties and the appliances in them ----------
    const hooper = await client({ name: 'Mrs Anne Hooper', type: 'homeowner', email: 'anne.hooper@example.com', phone: '01632 960141', address_line1: '3 Fore Street', town: 'Kingsbridge', postcode: 'TQ7 1PG' });
    const hooperHome = await property({ client_id: hooper.id, address_line1: '3 Fore Street', town: 'Kingsbridge', postcode: 'TQ7 1PG', tenure: 'owner_occupied' });
    const hooperBoiler = await asset({ property_id: hooperHome.id, appliance_type: 'Combi boiler', make: 'Worcester Bosch', model: 'Greenstar 30i', location: 'Kitchen', flue_type: 'RS', serial: 'WB30-448172', install_date: '2019-03-14', landlord_owned: false });

    const okafor = await client({ name: 'Mr Daniel Okafor', type: 'landlord', email: 'daniel.okafor@example.com', phone: '07700 900218', address_line1: '21 Church Road', town: 'Totnes', postcode: 'TQ9 5DE', notes: 'Two rentals in Totnes. Prefers a text before each visit.' });
    const mill = await property({ client_id: okafor.id, address_line1: '12 Mill Lane', town: 'Totnes', postcode: 'TQ9 5DW', tenure: 'private_rented', occupier_name: 'Ms Lucy Whitcombe', occupier_phone: '07700 900377' });
    const millBoiler = await asset({ property_id: mill.id, appliance_type: 'Combi boiler', make: 'Vaillant', model: 'ecoTEC plus 832', location: 'Kitchen', flue_type: 'RS', serial: 'VA832-209915', install_date: '2020-09-02', landlord_owned: true });
    const millHob = await asset({ property_id: mill.id, appliance_type: 'Hob', make: 'Bosch', model: 'PGP6B5B90', location: 'Kitchen', flue_type: 'FL', landlord_owned: true });
    const station = await property({ client_id: okafor.id, address_line1: 'Flat 2, 8 Station Road', town: 'Totnes', postcode: 'TQ9 5JR', tenure: 'private_rented', occupier_name: 'Mr Peter Hale', occupier_phone: '07700 900452' });
    const stationBoiler = await asset({ property_id: station.id, appliance_type: 'Combi boiler', make: 'Ideal', model: 'Logic+ Combi 24', location: 'Airing cupboard', flue_type: 'RS', serial: 'ID24-771003', install_date: '2018-05-21', landlord_owned: true });
    const stationCooker = await asset({ property_id: station.id, appliance_type: 'Cooker', make: 'Belling', model: 'Farmhouse 60G', location: 'Kitchen', flue_type: 'FL', landlord_owned: false });

    const quayside = await client({ name: 'Quayside Lettings', type: 'landlord', email: 'office@quaysidelettings.example', phone: '01632 960505', address_line1: '4 The Quay', town: 'Dartmouth', postcode: 'TQ6 9PS', vat_registered: true, notes: 'Managing agent. Keys from the office, ask for Karen.' });
    const regatta = await property({ client_id: quayside.id, address_line1: 'Flat 4, Regatta House', address_line2: 'South Embankment', town: 'Dartmouth', postcode: 'TQ6 9BH', tenure: 'private_rented', occupier_name: 'Mr and Mrs Sinclair' });
    const regattaBoiler = await asset({ property_id: regatta.id, appliance_type: 'Combi boiler', make: 'Baxi', model: '630 Combi', location: 'Utility cupboard', flue_type: 'RS', serial: 'BX630-118264', install_date: '2021-11-08', landlord_owned: true });
    const victoria = await property({ client_id: quayside.id, address_line1: '17 Victoria Road', town: 'Dartmouth', postcode: 'TQ6 9RT', tenure: 'private_rented', occupier_name: 'Ms Hannah Reid', occupier_phone: '07700 900630' });
    const victoriaBoiler = await asset({ property_id: victoria.id, appliance_type: 'System boiler', make: 'Glow-worm', model: 'Energy 18s', location: 'Loft', flue_type: 'RS', serial: 'GW18-560241', install_date: '2017-02-15', landlord_owned: true });
    const victoriaFire = await asset({ property_id: victoria.id, appliance_type: 'Gas fire', make: 'Valor', model: 'Dream Slimline', location: 'Lounge', flue_type: 'OF', landlord_owned: true });

    const lang = await client({ name: 'Mr Tom Lang', type: 'homeowner', email: 'tom.lang@example.com', phone: '07700 900104', address_line1: '9 Orchard Close', town: 'Ivybridge', postcode: 'PL21 9HN' });
    const langHome = await property({ client_id: lang.id, address_line1: '9 Orchard Close', town: 'Ivybridge', postcode: 'PL21 9HN', tenure: 'owner_occupied' });
    await asset({ property_id: langHome.id, appliance_type: 'Back boiler', make: 'Baxi', model: 'Bermuda 45/4', location: 'Lounge', flue_type: 'OF', landlord_owned: false });

    const blake = await client({ name: 'Ms Rachel Blake', type: 'homeowner', email: 'rachel.blake@example.com', phone: '07700 900589', address_line1: '27 Higher Street', town: 'Brixham', postcode: 'TQ5 8HW' });
    const blakeHome = await property({ client_id: blake.id, address_line1: '27 Higher Street', town: 'Brixham', postcode: 'TQ5 8HW', tenure: 'owner_occupied' });

    const pascoe = await client({ name: 'Mrs Jean Pascoe', type: 'homeowner', email: 'jean.pascoe@example.com', phone: '01632 960733', address_line1: 'Rosemount', address_line2: 'Coast Road', town: 'Thurlestone', postcode: 'TQ7 3NJ' });
    const pascoeHome = await property({ client_id: pascoe.id, address_line1: 'Rosemount', address_line2: 'Coast Road', town: 'Thurlestone', postcode: 'TQ7 3NJ', tenure: 'owner_occupied' });

    const bakery = await client({ name: 'The Old Bakery Café', type: 'commercial', email: 'hello@oldbakerycafe.example', phone: '01632 960912', address_line1: '2 Market Square', town: 'Modbury', postcode: 'PL21 0QW', vat_registered: true, notes: 'Work before 8am or after 4pm.' });
    const bakeryShop = await property({ client_id: bakery.id, address_line1: '2 Market Square', town: 'Modbury', postcode: 'PL21 0QW', tenure: 'owner_occupied', occupier_name: 'Tess Moreton' });
    const bakeryBoiler = await asset({ property_id: bakeryShop.id, appliance_type: 'Combi boiler', make: 'Vaillant', model: 'ecoTEC plus 835', location: 'Plant cupboard', flue_type: 'RS', serial: 'VA835-330178', install_date: day(-28), landlord_owned: false });

    // ---------- jobs ----------
    const line = (description, qty, pounds, kind = 'material', more = {}) => ({ description, qty, unit_price: P(pounds), vat_rate: 20, kind, ...more });
    const lastRev = job => job.revisions[job.revisions.length - 1];
    // Write the estimate, send it and take the customer's yes.
    const agreed = async (job, lines, by, method, note) => {
      const j = await api('saveRevision', job.id, lines, note);
      await api('markRevisionSent', lastRev(j).id);
      return api('acceptRevision', lastRev(j).id, { name: by, method, signature: method === 'signed' ? signature(by) : undefined });
    };

    // 1. Finished, invoiced and paid.
    let repair = await api('createJob', { client_id: hooper.id, property_id: hooperHome.id, title: 'Boiler repair: fan and circuit board' });
    await agreed(repair, [
      line('Fan assembly', 1, 185, 'material', { supplier: 'City Plumbing' }),
      line('Printed circuit board', 1, 210, 'material', { supplier: 'City Plumbing' }),
      line('Labour (per hour)', 2, 55, 'labour'),
    ], 'Anne Hooper', 'phone');
    await api('setJobStatus', repair.id, 'complete');
    const repairInv = await api('createInvoiceFromJob', repair.id, { issue_date: day(-35) });
    await api('addPayment', repairInv.id, { amount: repairInv.gross, date: day(-27), method: 'transfer', reference: 'HOOPER' });

    // 2. Finished and invoiced ten days ago, not yet paid.
    let safety = await api('createJob', { client_id: quayside.id, property_id: regatta.id, title: 'Gas safety check and boiler service, Flat 4' });
    await agreed(safety, [
      line('Landlord gas safety check', 1, 75, 'labour'),
      line('Boiler service', 1, 90, 'labour'),
    ], 'Karen Wills', 'email');
    await api('setJobStatus', safety.id, 'complete');
    await api('createInvoiceFromJob', safety.id, { issue_date: day(-10) });

    // 3. A boiler swap: second version accepted and signed, invoiced, deposit paid, balance now late.
    let swap = await api('createJob', { client_id: bakery.id, property_id: bakeryShop.id, title: 'Combi boiler replacement' });
    await api('saveRevision', swap.id, [
      line('Vaillant ecoTEC plus 832 combi boiler', 1, 1280, 'material', { supplier: 'Wolseley' }),
      line('Flue kit', 1, 98, 'material', { supplier: 'Wolseley' }),
      line('Magnetic system filter', 1, 140),
      line('Labour (per day)', 2, 320, 'labour'),
    ]);
    await agreed(swap, [
      line('Vaillant ecoTEC plus 835 combi boiler', 1, 1395, 'material', { supplier: 'Wolseley' }),
      line('Flue kit', 1, 98, 'material', { supplier: 'Wolseley' }),
      line('Magnetic system filter', 1, 140),
      line('Labour (per day)', 2, 320, 'labour'),
    ], 'Tess Moreton', 'signed', 'Customer chose the larger 835 model');
    await api('setJobStatus', swap.id, 'complete');
    const swapInv = await api('createInvoiceFromJob', swap.id, { issue_date: day(-32) });
    await api('addPayment', swapInv.id, { amount: P(600), date: day(-30), method: 'card', reference: 'Deposit' });

    // 4. Work complete with an approved extra: ready to invoice.
    let cylinder = await api('createJob', { client_id: pascoe.id, property_id: pascoeHome.id, title: 'Unvented cylinder replacement' });
    await agreed(cylinder, [
      line('210 litre unvented cylinder', 1, 780, 'material', { supplier: 'Wolseley' }),
      line('Expansion vessel and controls kit', 1, 165),
      line('Labour (per day)', 2, 320, 'labour'),
    ], 'Jean Pascoe', 'signed');
    cylinder = await api('addVariation', { job_id: cylinder.id, kind: 'extra', description: 'Replace two corroded isolating valves', qty: 2, unit_price: P(32), vat_rate: 20 });
    await api('decideVariation', cylinder.variations[0].id, 'approve', { by: 'Jean Pascoe', method: 'in_person' });
    await api('setJobStatus', cylinder.id, 'complete');

    // 5. Under way, with an extra waiting for the landlord's approval.
    let hob = await api('createJob', { client_id: okafor.id, property_id: mill.id, title: 'Replace gas hob' });
    await agreed(hob, [
      line('Bosch four-burner gas hob', 1, 285),
      line('Fitting and gas tightness test', 1, 95, 'labour'),
    ], 'Daniel Okafor', 'text');
    await api('setJobStatus', hob.id, 'in_progress');
    await api('addVariation', { job_id: hob.id, kind: 'extra', description: 'Replace hob isolation valve', qty: 1, unit_price: P(28), vat_rate: 20 });

    // 6. Two estimates out with customers, one on its second version.
    let back = await api('createJob', { client_id: lang.id, property_id: langHome.id, title: 'Replace back boiler with a combi' });
    await api('saveRevision', back.id, [
      line('Worcester Bosch Greenstar 4000 30kW combi boiler', 1, 1420, 'material', { supplier: 'City Plumbing' }),
      line('Flue kit', 1, 89),
      line('Magnetic system filter', 1, 140),
      line('Power flush', 1, 450, 'labour'),
      line('Labour (per day)', 2, 320, 'labour'),
    ]);
    back = await api('saveRevision', back.id, [
      line('Worcester Bosch Greenstar 4000 30kW combi boiler', 1, 1420, 'material', { supplier: 'City Plumbing' }),
      line('Flue kit', 1, 89),
      line('Magnetic system filter', 1, 140),
      line('Chemical flush and inhibitor', 1, 120, 'labour'),
      line('Labour (per day)', 2, 320, 'labour'),
    ], 'Chemical flush in place of the power flush');
    await api('markRevisionSent', lastRev(back).id);

    let flush = await api('createJob', { client_id: blake.id, property_id: blakeHome.id, title: 'Power flush and system filter' });
    flush = await api('saveRevision', flush.id, [
      line('Power flush', 1, 450, 'labour'),
      line('Magnetic system filter', 1, 140),
      line('Inhibitor (1 litre)', 1, 18),
    ]);
    await api('markRevisionSent', lastRev(flush).id);

    // 7. Still being priced, and one bare enquiry.
    const radiator = await api('createJob', { client_id: hooper.id, property_id: hooperHome.id, title: 'Move bathroom radiator' });
    await api('saveRevision', radiator.id, [
      line('Move radiator and alter pipework', 4, 55, 'labour'),
      line('Radiator valves (pair)', 1, 24),
    ]);
    await api('createJob', { client_id: quayside.id, property_id: victoria.id, title: 'Gas fire not staying lit' });

    // ---------- what was spent ----------
    // An account that is not VAT registered records what it paid in full, with no VAT split out.
    const spent = (n, payee, description, category, net, tax, job) =>
      api('saveExpense', { date: day(n), payee, description, category, net: P(vat ? net : net + tax), vat: P(vat ? tax : 0), job_id: job ? job.id : undefined });
    await spent(-36, 'City Plumbing', 'Fan assembly and circuit board', 'materials', 274, 54.8, repair);
    await spent(-33, 'Wolseley', 'Vaillant ecoTEC plus 835 and flue kit', 'materials', 968, 193.6, swap);
    await spent(-31, 'Screwfix', 'System filter and fittings', 'materials', 118.5, 23.7, swap);
    await spent(-24, 'Market Street Garage', 'Diesel', 'vehicle', 70.83, 14.17);
    await spent(-18, 'Toolstation', 'Flue gas analyser calibration', 'tools', 85, 17);
    await spent(-12, 'Wolseley', 'Unvented cylinder and expansion kit', 'materials', 612, 122.4, cylinder);
    await spent(-9, 'Mobile phone contract', 'Monthly bill', 'office', 25, 5);
    await spent(-3, 'Market Street Garage', 'Diesel', 'vehicle', 66.67, 13.33);

    // ---------- gas records ----------
    let certificates = 0;
    if (gas) {
      const licence = b.engineer_licence || '';
      const fine = (a, readings = {}) => ({
        asset_id: a.id, location: a.location, appliance_type: a.appliance_type, make: a.make, model: a.model,
        landlord_owned: a.landlord_owned ? 'yes' : 'no', inspected: 'yes', flue_type: a.flue_type,
        safety_devices: 'yes', ventilation: 'yes', flue_condition: a.flue_type === 'FL' ? 'na' : 'yes', flue_test: a.flue_type === 'FL' ? 'na' : 'pass',
        serviced: 'no', safe_to_use: 'yes', ...readings,
      });
      const boilerReadings = (kw, co, co2) => ({ operating_pressure: '20', heat_input: String(kw), co_ppm: String(co), co2_pct: String(co2), ratio: (co / (co2 * 10000)).toFixed(4), serviced: 'yes' });
      const installation = { tightness: 'pass', ecv_access: 'yes', bonding: 'yes', co_alarm_fitted: 'yes', co_alarm_tested: 'yes' };
      const cert = async d => { certificates++; return api('saveCertificate', { signature: mine, ...d, data: { engineer_name: engineer, engineer_licence: licence, ...d.data } }); };
      // What the forms keep about the appliance a record is for.
      const snapshot = a => ({ appliance_type: a.appliance_type, make: a.make, model: a.model, location: a.location, flue_type: a.flue_type, serial: a.serial });
      const landlord = c => ({ landlord_name: c.name, landlord_contact: c.phone, landlord_address: [c.address_line1, c.town, c.postcode].join(', ') });

      // Last year's check at 12 Mill Lane: the next one fell due six days ago.
      await cert({ type: 'lgsr', client_id: okafor.id, property_id: mill.id, issue_date: dueIn(-6),
        data: { ...landlord(okafor), occupier_name: 'Ms Lucy Whitcombe', installation, appliances: [fine(millBoiler, boilerReadings(32, 62, 9.1)), fine(millHob)],
          received_by: 'Lucy Whitcombe', received_signature: signature('Lucy Whitcombe') } });

      // Flat 2, Station Road: due in three weeks. The tenant's cooker was left At Risk with a warning notice.
      await cert({ type: 'warning', client_id: okafor.id, property_id: station.id, asset_id: stationCooker.id, issue_date: dueIn(20),
        data: { appliance: snapshot(stationCooker), classification: 'AR', fault: 'Flame failure device not working on the rear left burner.', actions: { turned_off: true, labelled: true },
          received_by: 'Peter Hale', received_signature: signature('Peter Hale') } });
      await cert({ type: 'lgsr', client_id: okafor.id, property_id: station.id, issue_date: dueIn(20),
        data: { ...landlord(okafor), occupier_name: 'Mr Peter Hale', installation, warning_issued: 'yes',
          appliances: [fine(stationBoiler, boilerReadings(24, 48, 8.9)), { ...fine(stationCooker), safety_devices: 'no', safe_to_use: 'no' }],
          defects: 'Cooker (tenant owned): flame failure device not working on the rear left burner.', remedial: 'Burner turned off and labelled. Warning notice issued to the tenant.',
          received_by: 'Peter Hale', received_signature: signature('Peter Hale') } });

      // Mrs Hooper's annual service: two days overdue.
      await cert({ type: 'service', client_id: hooper.id, property_id: hooperHome.id, asset_id: hooperBoiler.id, issue_date: dueIn(-2),
        data: { appliance: snapshot(hooperBoiler), checks: { burner: true, heat_exchanger: true, seals: true, flue: true, controls: true, condensate: true, expansion: true, pressure: true },
          operating_pressure: '20', heat_input: '30', co_ppm: '71', co2_pct: '9.2', ratio: '0.0008', safe_to_use: 'yes', notes: 'Condensate trap cleaned. System pressure topped up to 1.2 bar.',
          received_by: 'Anne Hooper', received_signature: signature('Anne Hooper') } });

      // 17 Victoria Road: due in about six weeks.
      await cert({ type: 'lgsr', client_id: quayside.id, property_id: victoria.id, issue_date: dueIn(44),
        data: { ...landlord(quayside), occupier_name: 'Ms Hannah Reid', installation, appliances: [fine(victoriaBoiler, boilerReadings(18, 55, 9.0)), fine(victoriaFire, { operating_pressure: '20', heat_input: '4.4' })],
          received_by: 'Hannah Reid', received_signature: signature('Hannah Reid') } });

      // Flat 4, Regatta House: done ten days ago as part of the invoiced job.
      await cert({ type: 'lgsr', client_id: quayside.id, property_id: regatta.id, job_id: safety.id, issue_date: day(-10),
        data: { ...landlord(quayside), occupier_name: 'Mr and Mrs Sinclair', installation, appliances: [fine(regattaBoiler, boilerReadings(30, 58, 9.0))],
          received_by: 'Karen Wills', received_signature: signature('Karen Wills') } });

      // The café's new boiler: commissioned four weeks ago, Gas Safe not yet notified.
      await cert({ type: 'commissioning', client_id: bakery.id, property_id: bakeryShop.id, asset_id: bakeryBoiler.id, job_id: swap.id, issue_date: day(-28),
        data: { appliance: snapshot(bakeryBoiler), gas_rate: '34.9', burner_pressure: '12.5', flow_temp: '70', hw_temp: '55',
          readings: { max_co: '64', max_co2: '9.1', max_ratio: '0.0007', min_co: '38', min_co2: '8.7', min_ratio: '0.0004' },
          controls: { time_temp_ch: true, time_temp_hw: true, trvs: true, bypass: true, interlock: true }, water: { flushed: true, cleaner: true, inhibitor: true, filter: true },
          received_by: 'Tess Moreton', received_signature: signature('Tess Moreton') } });
    }

    return { clients: 7, jobs: 9, certificates };
  }

  return { load, loaded };
})();
