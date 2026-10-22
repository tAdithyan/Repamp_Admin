import React from 'react';
export function Field({ label, children }) { return <label className="mp-field"><span>{label}</span>{children}</label>; }
export function Status({ children }) { return <div className="mp-status" role="status">{children}</div>; }
