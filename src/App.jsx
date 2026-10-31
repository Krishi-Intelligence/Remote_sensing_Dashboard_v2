import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import MapViewer from './components/MapViewer';
import DrawControls from './components/DrawControls';
import FieldSidebar from './components/FieldSidebar';
import FarmAnalysisPanel from './components/FarmAnalysisPanel';
import FarmDetailsForm from './components/FarmDetailsForm';
import SustainablePanel from './components/SustainablePanel';
import YieldPanel from './components/YieldPanel';
import CarbonCreditPanel from './components/CarbonCreditPanel';
import { calculatePolygonMetrics, downloadGeoJSON, polygonsToGeoJSON, parseFarmFile, delineatedFieldAt, overlapShare } from './utils/geoUtils';
import { fetchDelineation } from './utils/eeClient';
import { DEFAULT_LOCATION } from './data/indiaLocations';

export default function App() {
  // Navigation View State: 'landing' | 'login' | 'dashboard'
  const [viewMode, setViewMode] = useState('landing');

  // User Session State
  const [user, setUser] = useState(null);

  // Map Target Location
  const [targetLocation, setTargetLocation] = useState(DEFAULT_LOCATION);

  // Basemap Selection ('satellite' | 'sentinel2' | 'google' | 'street')
  const [activeBasemap, setActiveBasemap] = useState('satellite');

  // Drawing Mode & State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingVertices, setDrawingVertices] = useState([]);

  // Farm boundaries waiting for their farmer details (from upload, drawing or click)
  const [pendingFarms, setPendingFarms] = useState([]);

  // Finished Fields / Polygons
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Click-to-delineate mode and its status: { status: 'idle' | 'loading' | 'error', message? }
  const [delineateMode, setDelineateMode] = useState(false);
  const [delineating, setDelineating] = useState({ status: 'idle' });

  // Field whose data analysis is open in the results panel
  const [analysisFieldId, setAnalysisFieldId] = useState(null);

  // Field whose sustainable farming suggestion is open in the results panel
  const [sustainableFieldId, setSustainableFieldId] = useState(null);

  // Field whose yield estimation is open in the results panel
  const [yieldFieldId, setYieldFieldId] = useState(null);

  // Field whose carbon credit panel is open
  const [carbonFieldId, setCarbonFieldId] = useState(null);

  // Sentinel-2 RGB image shown on the map: { fieldId, date, tileUrl } or null
  const [rgbLayer, setRgbLayer] = useState(null);

  // Open Login Page from Front / Landing Page
  const handleOpenLogin = () => {
    setViewMode('login');
  };

  // Back to Landing Page from Login
  const handleBackToLanding = () => {
    setViewMode('landing');
  };

  // Handle Login from LoginPage
  const handleLogin = (userData) => {
    setUser(userData);
    const target = userData.customCoords || userData.targetLocation || DEFAULT_LOCATION;
    setTargetLocation(target);
    setViewMode('dashboard');
  };

  // Handle Logout (returns to Front Page)
  const handleLogout = () => {
    setUser(null);
    setIsDrawing(false);
    setDrawingVertices([]);
    setPendingFarms([]);
    setViewMode('landing');
  };

  // Handle Target Location Change from Header Switcher
  const handleLocationChange = ({ state, district, targetLocation: newLoc }) => {
    setUser(prev => ({
      ...prev,
      state,
      district
    }));
    setTargetLocation(newLoc);
  };

  // Step 2: draw the polygon by hand
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawingVertices([]);
  };

  // Undo Last Placed Point
  const handleUndoVertex = () => {
    setDrawingVertices(prev => prev.slice(0, -1));
  };

  // Cancel Drawing
  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingVertices([]);
  };

  // Crop history from ALU for a drawn or uploaded farm, looked up at the farm's centre point.
  // The farm keeps its own boundary; only the crop, crop history and overlap come from ALU.
  const attachAluHistory = async (farm) => {
    if (!farm.centroid) return;
    const { lat, lng } = farm.centroid;
    let update;
    try {
      const { features } = await fetchDelineation(lat, lng);
      const alu = delineatedFieldAt(features, lat, lng);
      update = alu
        ? {
            aluStatus: 'found',
            aluCrop: alu.crop,
            cropCycles: alu.cropCycles,
            cropHistory: alu.cropHistory,
            aluOverlap: overlapShare(farm.coordinates, alu.coordinates)
          }
        : { aluStatus: 'none' };
    } catch (err) {
      update = { aluStatus: 'error', aluError: err.message };
    }
    // The crop entered by the farmer is never replaced; the ALU crop only fills an empty one
    const apply = f => (f.id === farm.id ? { ...f, ...update, crop: f.crop || update.aluCrop || '' } : f);
    setPendingFarms(prev => prev.map(apply));
    setFields(prev => prev.map(apply));
  };

  // Complete Drawing: the boundary waits for the farm details, and its crop history is fetched from ALU
  const handleCompleteDrawing = () => {
    if (drawingVertices.length < 3) return;

    const metrics = calculatePolygonMetrics(drawingVertices);
    const farm = {
      id: `field_${Date.now()}`,
      coordinates: [...drawingVertices],
      areaHectares: metrics.areaHectares,
      areaAcres: metrics.areaAcres,
      perimeterMeters: metrics.perimeterMeters,
      centroid: metrics.centroid,
      createdAt: new Date().toISOString(),
      aluStatus: 'loading'
    };
    setPendingFarms(prev => [...prev, farm]);
    setIsDrawing(false);
    setDrawingVertices([]);
    attachAluHistory(farm);
  };

  // Step 1: upload a shapefile (.zip / .shp) or GeoJSON; its farms wait for the farm details
  const handleUploadFarmFile = async (file) => {
    try {
      const uploaded = await parseFarmFile(file);
      if (uploaded.length === 0) {
        window.alert('No polygon farms were found in this file.');
        return;
      }
      const farms = uploaded.map(f => ({ ...f, aluStatus: 'loading' }));
      setPendingFarms(prev => [...prev, ...farms]);
      setTargetLocation({ lat: farms[0].centroid.lat, lng: farms[0].centroid.lng, zoom: 16 });
      // One ALU lookup at a time, so a file with many farms does not flood the API
      for (const farm of farms) {
        await attachAluHistory(farm);
      }
    } catch (err) {
      window.alert(`Could not read this file: ${err.message}`);
    }
  };

  // Step 3: a map click in delineate mode gets the farm boundary under that point
  const handleDelineateAt = async (lat, lng) => {
    setDelineating({ status: 'loading' });
    try {
      const { features } = await fetchDelineation(lat, lng);
      const farm = delineatedFieldAt(features, lat, lng);
      if (!farm) {
        setDelineating({ status: 'error', message: 'No farm boundary found at this point. Try another spot.' });
        return;
      }
      setPendingFarms(prev => [...prev, farm]);
      setDelineating({ status: 'idle' });
    } catch (err) {
      setDelineating({ status: 'error', message: `Could not delineate: ${err.message}` });
    }
  };

  // Farm details submitted: the first waiting boundary becomes a farm
  const handleSaveFarm = ({ farmerName, crop, startDate, endDate }) => {
    const farm = pendingFarms[0];
    if (!farm) return;

    const field = {
      ...farm,
      name: `${farmerName} (${crop})`,
      farmerName,
      crop,
      startDate,
      endDate
    };
    setFields(prev => [field, ...prev]);
    setSelectedFieldId(field.id);
    setPendingFarms(prev => prev.slice(1));
  };

  // Boundary skipped: remove it from the waiting list
  const handleSkipFarm = () => {
    setPendingFarms(prev => prev.slice(1));
  };

  // Solutions on the right panel. Each one works on the selected farm; only one panel is open at a time.
  const handleOpenSolution = (solutionId, field) => {
    setAnalysisFieldId(null);
    setSustainableFieldId(null);
    setYieldFieldId(null);
    setCarbonFieldId(null);
    setRgbLayer(null);
    if (solutionId === 'analysis')    setAnalysisFieldId(field.id);
    if (solutionId === 'sustainable') setSustainableFieldId(field.id);
    if (solutionId === 'yield')       setYieldFieldId(field.id);
    if (solutionId === 'carbon')      setCarbonFieldId(field.id);
  };

  // Close the yield estimation panel
  const handleCloseYield = () => {
    setYieldFieldId(null);
  };

  // Close the carbon credit panel
  const handleCloseCarbon = () => {
    setCarbonFieldId(null);
  };

  // Close the analysis panel and remove its RGB layer from the map
  const handleCloseAnalysis = () => {
    setAnalysisFieldId(null);
    setRgbLayer(null);
  };

  // Close the sustainable farming panel
  const handleCloseSustainable = () => {
    setSustainableFieldId(null);
  };

  // Save the crops of the previous seasons entered in the sustainable farming panel
  const handleUpdateSeasons = (id, seasons) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, seasons } : f));
  };

  // Delete Individual Field
  const handleDeleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  // Rename Field
  const handleRenameField = (id, newName) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  // Zoom to Field
  const handleZoomToField = (field) => {
    if (field.centroid) {
      setTargetLocation({
        lat: field.centroid.lat,
        lng: field.centroid.lng,
        zoom: 16,
        district: field.name
      });
      setSelectedFieldId(field.id);
    }
  };

  // Center Back on User District
  const handleCenterOnDistrict = () => {
    const originalTarget = user?.customCoords || user?.targetLocation || DEFAULT_LOCATION;
    setTargetLocation({ ...originalTarget });
  };

  // Export All as GeoJSON
  const handleExportGeoJSON = () => {
    if (fields.length === 0) return;
    const geojson = polygonsToGeoJSON(fields);
    downloadGeoJSON(geojson, `${user?.district?.toLowerCase().replace(/\s+/g, '_') || 'satellite'}_parcels.geojson`);
  };

  // Clear All Fields
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all drawn field boundaries?')) {
      setFields([]);
      setSelectedFieldId(null);
    }
  };

  // View Routing:
  // 1. Landing / Front Page (Explains the platform & has Login button)
  if (viewMode === 'landing') {
    return <LandingPage onOpenLogin={handleOpenLogin} />;
  }

  // 2. Simple Login Page (Name, Email, Phone, State, District)
  if (viewMode === 'login' || !user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  // 3. Main Satellite GIS & Field Delineation Dashboard
  const analysisField   = fields.find(f => f.id === analysisFieldId);
  const sustainableField = fields.find(f => f.id === sustainableFieldId);
  const yieldField      = fields.find(f => f.id === yieldFieldId);
  const carbonField     = fields.find(f => f.id === carbonFieldId);
  const nextFarm = pendingFarms[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Navigation Header */}
      <Header
        user={user}
        fields={fields}
        onLocationChange={handleLocationChange}
        onExportGeoJSON={handleExportGeoJSON}
        onClearAll={handleClearAll}
        onLogout={handleLogout}
      />

      {/* Main Workspace: Interactive Map & Field Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Floating Toolbars & Controls */}
        <DrawControls
          isDrawing={isDrawing}
          onStartDrawing={handleStartDrawing}
          onFinishDrawing={handleCompleteDrawing}
          onCancelDrawing={handleCancelDrawing}
          onUndoVertex={handleUndoVertex}
          drawingVerticesCount={drawingVertices.length}
          activeBasemap={activeBasemap}
          onChangeBasemap={setActiveBasemap}
          onCenterOnLocation={handleCenterOnDistrict}
          userLocationName={user.district}
          onUploadFarmFile={handleUploadFarmFile}
          delineateMode={delineateMode}
          onToggleDelineate={() => setDelineateMode(prev => !prev)}
          delineating={delineating}
          farmForm={nextFarm && !isDrawing ? (
            <FarmDetailsForm
              key={nextFarm.id}
              farm={nextFarm}
              queueLabel={pendingFarms.length > 1 ? `Farm 1 of ${pendingFarms.length}` : ''}
              onSubmit={handleSaveFarm}
              onCancel={handleSkipFarm}
            />
          ) : null}
        />

        {/* High-Resolution Satellite Map Engine */}
        <MapViewer
          targetLocation={targetLocation}
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          isDrawing={isDrawing}
          drawingVertices={drawingVertices}
          setDrawingVertices={setDrawingVertices}
          onCompleteDrawing={handleCompleteDrawing}
          activeBasemap={activeBasemap}
          rgbLayer={rgbLayer}
          delineateMode={delineateMode}
          onDelineatePoint={handleDelineateAt}
        />

        {/* Right Sidebar: Solutions and Delineated Parcels */}
        <FieldSidebar
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelectField={setSelectedFieldId}
          onDeleteField={handleDeleteField}
          onRenameField={handleRenameField}
          onZoomToField={handleZoomToField}
          onOpenSolution={handleOpenSolution}
        />
      </div>

      {/* Data Analysis: pick a satellite date, see NDVI and cloud cover, show RGB on the map */}
      {analysisField && (
        <FarmAnalysisPanel
          key={analysisField.id}
          field={analysisField}
          rgbLayer={rgbLayer}
          onShowRgb={setRgbLayer}
          onClose={handleCloseAnalysis}
        />
      )}

      {/* Yield estimation: canopy strength over the season and, once calibrated, kg/ha */}
      {yieldField && (
        <YieldPanel
          key={yieldField.id}
          field={yieldField}
          onClose={handleCloseYield}
        />
      )}

      {/* Sustainable farming: suggests the next crop from the farm's previous seasons */}
      {sustainableField && (
        <SustainablePanel
          key={`${sustainableField.id}-${sustainableField.aluStatus || ''}`}
          field={sustainableField}
          onUpdateSeasons={handleUpdateSeasons}
          onClose={handleCloseSustainable}
        />
      )}

      {/* Carbon Credits: total tCO₂e, estimated value, and factor breakdown */}
      {carbonField && (
        <CarbonCreditPanel
          key={carbonField.id}
          field={carbonField}
          onUpdateSeasons={handleUpdateSeasons}
          onClose={handleCloseCarbon}
        />
      )}

    </div>
  );
}
