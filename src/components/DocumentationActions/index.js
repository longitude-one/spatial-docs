import React from 'react';

export default function DocumentationActions({ actions }) {
  if (!actions) return null;
  return (
    <p className="documentation-actions" role="group" aria-label="Documentation actions">
      <a href={actions.markdown} rel="alternate" type="text/markdown">View Markdown version</a>
      {actions.edit && (
        <a href={actions.edit} target="_blank" rel="noopener noreferrer"
          aria-label="Edit this page on GitHub (opens in a new tab)">
          Edit this page on GitHub
        </a>
      )}
    </p>
  );
}
