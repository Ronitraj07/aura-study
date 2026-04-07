// ============================================================
// checklistExport.ts — Export checklist data to various formats
// Supports CSV, JSON, and Markdown exports
// ============================================================

interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'study' | 'personal' | 'project';
  due_date?: string;
  completed_at?: string;
  estimated_minutes?: number;
  position: number;
}

// Export checklist to CSV format
export async function exportChecklistCSV(tasks: ChecklistTask[], title: string = 'My Checklist'): Promise<void> {
  // Prepare CSV headers
  const headers = [
    'Task',
    'Status', 
    'Priority',
    'Category',
    'Due Date',
    'Completed Date',
    'Estimated Minutes',
    'Position'
  ];

  // Convert tasks to CSV rows
  const csvRows = tasks.map(task => {
    return [
      `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
      task.completed ? 'Completed' : 'Pending',
      task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      task.category.charAt(0).toUpperCase() + task.category.slice(1),
      task.due_date || '',
      task.completed_at ? new Date(task.completed_at).toLocaleDateString() : '',
      task.estimated_minutes?.toString() || '',
      task.position.toString()
    ].join(',');
  });

  // Combine headers and data
  const csvContent = [headers.join(','), ...csvRows].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_checklist.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export checklist to JSON format (complete data)
export async function exportChecklistJSON(tasks: ChecklistTask[], title: string = 'My Checklist'): Promise<void> {
  const exportData = {
    title,
    exportedAt: new Date().toISOString(),
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    completionRate: Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100),
    tasks: tasks.map(task => ({
      ...task,
      // Add computed fields for analysis
      isOverdue: task.due_date && !task.completed 
        ? new Date(task.due_date) < new Date() 
        : false,
      timeSpent: task.completed_at && task.estimated_minutes 
        ? `${task.estimated_minutes} minutes (estimated)` 
        : null
    })),
    statistics: {
      byCategory: {
        study: tasks.filter(t => t.category === 'study').length,
        personal: tasks.filter(t => t.category === 'personal').length,
        project: tasks.filter(t => t.category === 'project').length
      },
      byPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      withDueDates: tasks.filter(t => t.due_date).length,
      overdue: tasks.filter(t => 
        t.due_date && !t.completed && new Date(t.due_date) < new Date()
      ).length
    }
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_checklist.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export checklist to Markdown format
export async function exportChecklistMarkdown(tasks: ChecklistTask[], title: string = 'My Checklist'): Promise<void> {
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  
  const markdown = `# ${title}

**Exported:** ${new Date().toLocaleDateString()}  
**Progress:** ${completed.length}/${tasks.length} tasks completed (${Math.round((completed.length / tasks.length) * 100)}%)

## 📋 Summary

- **Total Tasks:** ${tasks.length}
- **Completed:** ${completed.length}
- **Remaining:** ${pending.length}
- **Overdue:** ${tasks.filter(t => t.due_date && !t.completed && new Date(t.due_date) < new Date()).length}

## ✅ Completed Tasks

${completed.length === 0 ? '*No completed tasks yet*' : completed.map(task => 
  `- [x] **${task.title}** *(${task.priority} priority, ${task.category})*${task.completed_at ? `  \n  Completed: ${new Date(task.completed_at).toLocaleDateString()}` : ''}`
).join('\n')}

## ⏳ Pending Tasks

${pending.length === 0 ? '*All tasks completed!* 🎉' : pending.map(task => 
  `- [ ] **${task.title}** *(${task.priority} priority, ${task.category})*${task.due_date ? `  \n  Due: ${new Date(task.due_date).toLocaleDateString()}` : ''}${task.estimated_minutes ? `  \n  Estimated: ${task.estimated_minutes} minutes` : ''}`
).join('\n')}

## 📊 Statistics

### By Category
- **Study:** ${tasks.filter(t => t.category === 'study').length} tasks
- **Personal:** ${tasks.filter(t => t.category === 'personal').length} tasks  
- **Project:** ${tasks.filter(t => t.category === 'project').length} tasks

### By Priority
- **High:** ${tasks.filter(t => t.priority === 'high').length} tasks
- **Medium:** ${tasks.filter(t => t.priority === 'medium').length} tasks
- **Low:** ${tasks.filter(t => t.priority === 'low').length} tasks

---
*Generated by Aura Study - AI-Powered Learning Platform*
`;

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_checklist.md`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}