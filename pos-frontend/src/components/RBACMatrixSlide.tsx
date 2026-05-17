'use client';

import React from 'react';
import './RBACMatrixSlide.css';

interface Permission {
    category: string;
    permissions: {
        name: string;
        admin: boolean;
        manager: boolean;
        supervisor: boolean;
        cashier: boolean;
    }[];
}

const RBACMatrixSlide: React.FC = () => {
    const permissions: Permission[] = [
        {
            category: 'Transaction Management',
            permissions: [
                { name: 'Process Sales', admin: true, manager: true, supervisor: true, cashier: true },
                { name: 'Void Transactions', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'Issue Refunds', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'Split Payments', admin: true, manager: true, supervisor: true, cashier: true },
            ],
        },
        {
            category: 'Discounts & Approvals',
            permissions: [
                { name: 'Apply Discounts', admin: true, manager: true, supervisor: false, cashier: false },
                { name: 'Approve Senior/PWD', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'Approve Manual Discounts', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'View Discount Usage', admin: true, manager: true, supervisor: true, cashier: false },
            ],
        },
        {
            category: 'Inventory Management',
            permissions: [
                { name: 'View Inventory', admin: true, manager: true, supervisor: true, cashier: true },
                { name: 'Edit Stock Levels', admin: true, manager: true, supervisor: false, cashier: false },
                { name: 'Manage Stock Transfer', admin: true, manager: true, supervisor: false, cashier: false },
                { name: 'Set Stock Alerts', admin: true, manager: true, supervisor: false, cashier: false },
            ],
        },
        {
            category: 'Reports & Analytics',
            permissions: [
                { name: 'View Daily Reports', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'View Sales Analytics', admin: true, manager: true, supervisor: true, cashier: false },
                { name: 'View Product Performance', admin: true, manager: true, supervisor: false, cashier: false },
                { name: 'Export Reports', admin: true, manager: true, supervisor: false, cashier: false },
            ],
        },
        {
            category: 'System Administration',
            permissions: [
                { name: 'Manage Users', admin: true, manager: false, supervisor: false, cashier: false },
                { name: 'Manage Roles & Permissions', admin: true, manager: false, supervisor: false, cashier: false },
                { name: 'Configure System Settings', admin: true, manager: false, supervisor: false, cashier: false },
                { name: 'View Audit Logs', admin: true, manager: true, supervisor: false, cashier: false },
            ],
        },
    ];

    return (
        <div className="rbac-matrix-slide">
            <div className="slide-header">
                <h1>Role-Based Access Control (RBAC) Matrix</h1>
                <p className="slide-subtitle">POS System Permissions Overview</p>
            </div>

            <div className="matrix-container">
                <table className="rbac-table">
                    <thead>
                        <tr>
                            <th className="permission-column">Permission</th>
                            <th className="role-column">Admin</th>
                            <th className="role-column">Manager</th>
                            <th className="role-column">Supervisor</th>
                            <th className="role-column">Cashier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map((permGroup, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                <tr className="category-row">
                                    <td colSpan={5} className="category-header">
                                        {permGroup.category}
                                    </td>
                                </tr>
                                {permGroup.permissions.map((perm, permIdx) => (
                                    <tr key={`${groupIdx}-${permIdx}`} className="permission-row">
                                        <td className="permission-name">{perm.name}</td>
                                        <td className="role-cell">
                                            {perm.admin && <span className="checkmark">✓</span>}
                                        </td>
                                        <td className="role-cell">
                                            {perm.manager && <span className="checkmark">✓</span>}
                                        </td>
                                        <td className="role-cell">
                                            {perm.supervisor && <span className="checkmark">✓</span>}
                                        </td>
                                        <td className="role-cell">
                                            {perm.cashier && <span className="checkmark">✓</span>}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="slide-footer">
                <p className="role-description">
                    <strong>Admin:</strong> Full system access with all permissions
                    &nbsp; | &nbsp;
                    <strong>Manager:</strong> Management and reporting capabilities
                    &nbsp; | &nbsp;
                    <strong>Supervisor:</strong> Approval and oversight permissions
                    &nbsp; | &nbsp;
                    <strong>Cashier:</strong> Basic transaction processing
                </p>
            </div>
        </div>
    );
};

export default RBACMatrixSlide;
