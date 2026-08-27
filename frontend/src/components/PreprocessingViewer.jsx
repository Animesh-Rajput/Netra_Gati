import React, { useState } from 'react';

export default function PreprocessingViewer({ stages, ocrResult }) {
  const [selectedStage, setSelectedStage] = useState('clahe');

  if (!stages) return null;

  const stageList = [
    {
      id: 'grayscale',
      tag: '01_GRAYSCALE',
      name: 'Grayscale Normalization',
      desc: 'Converts 3-channel RGB matrix to 8-bit single-channel luminance, removing chromatic variance.'
    },
    {
      id: 'clahe',
      tag: '02_CLAHE',
      name: 'CLAHE Equalization',
      desc: 'Contrast Limited Adaptive Histogram Equalization with 3.0 clip limit across 8x8 tile grids.'
    },
    {
      id: 'threshold',
      tag: '03_THRESHOLD',
      name: 'Bilateral Filter + Otsu',
      desc: 'Denoising filter preserving character edges followed by Otsu optimal global thresholding.'
    },
    {
      id: 'plate_crop',
      tag: '04_PLATE_ROI',
      name: 'Bounding Box Extraction',
      desc: 'Morphological closing and contour aspect ratio filtering isolating license plate ROI.'
    }
  ];

  return (
    <div className="rounded bg-bg-surface border border-border-hairline p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border-hairline pb-2.5">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-txt-primary">
            Computer Vision Preprocessing Pipeline
          </h3>
          <p className="text-[11px] text-txt-secondary">
            Multi-stage image processing telemetry and intermediate representations
          </p>
        </div>
        <span className="text-[10px] font-mono text-txt-muted">
          OPENCV 4.12 // ENGINE
        </span>
      </div>

      {/* Stage Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stageList.map((st) => {
          const isActive = selectedStage === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStage(st.id)}
              className={`p-2 rounded text-left border transition-colors ${
                isActive
                  ? 'bg-bg-elevated border-accent-teal text-txt-primary'
                  : 'bg-bg-primary border-border-hairline text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated'
              }`}
            >
              <span className="text-[10px] font-mono font-bold text-accent-teal block">
                {st.tag}
              </span>
              <span className="text-xs font-medium block truncate mt-0.5">
                {st.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-bg-primary p-3 rounded border border-border-hairline">
        <div className="flex items-center justify-center min-h-[200px] max-h-[260px] bg-black rounded p-2 border border-border-hairline overflow-hidden">
          {stages[selectedStage] ? (
            <img
              src={stages[selectedStage]}
              alt={selectedStage}
              className="max-h-[220px] max-w-full object-contain rounded"
            />
          ) : (
            <span className="text-txt-muted text-xs font-mono">Stage preview unavailable</span>
          )}
        </div>

        <div className="space-y-2.5">
          <div>
            <span className="text-[10px] font-mono uppercase text-accent-teal block">
              {stageList.find(s => s.id === selectedStage)?.tag}
            </span>
            <h4 className="text-xs font-bold text-txt-primary mt-0.5">
              {stageList.find(s => s.id === selectedStage)?.name}
            </h4>
            <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
              {stageList.find(s => s.id === selectedStage)?.desc}
            </p>
          </div>

          <div className="p-2.5 rounded bg-bg-surface border border-border-hairline text-[11px] font-mono text-txt-muted">
            <span className="text-txt-secondary font-semibold block mb-0.5">Production Architecture Note:</span>
            In enterprise municipal deployments, this pipeline integrates with TensorRT-accelerated YOLOv8-nano + PaddleOCR / CRNN at the edge.
          </div>
        </div>
      </div>
    </div>
  );
}