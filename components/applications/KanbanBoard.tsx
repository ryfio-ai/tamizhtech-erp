'use client';

import { useState } from 'react';
import { Application } from '@/types';
import KanbanColumn from './KanbanColumn';
import { ApplicationStatusEnum } from '@/lib/validations';

interface KanbanBoardProps {
  applications: Application[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (status: string) => void;
}

export default function KanbanBoard({ 
  applications, 
  onView, 
  onDelete, 
  onAdd 
}: KanbanBoardProps) {
  const statuses = ApplicationStatusEnum.options;

  const getApplicationsByStatus = (status: string) => {
    return applications.filter((app) => app.status === status);
  };

  return (
    <div className="flex space-x-6 overflow-x-auto pb-6 h-full min-h-[500px]">
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          title={status}
          status={status}
          applications={getApplicationsByStatus(status)}
          onView={onView}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
