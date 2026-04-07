// ============================================================
// timetableExport.ts — Export timetable data to various formats
// Supports CSV, iCal, PDF, and JSON exports for calendar integration
// ============================================================

interface Subject {
  name: string;
  color?: string;
  hours_per_week?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface TimeSlot {
  subject: string;
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  duration: number;   // minutes
  room?: string;
  instructor?: string;
  notes?: string;
}

interface Schedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

interface Timetable {
  subjects: Subject[];
  schedule: Schedule;
  mode: 'normal' | 'exam';
  preferred_study_time?: string;
  hours_per_day?: number;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Export timetable to CSV format
export async function exportTimetableCSV(timetable: Timetable, title: string = 'My Timetable'): Promise<void> {
  const headers = ['Day', 'Start Time', 'End Time', 'Subject', 'Duration (minutes)', 'Room', 'Instructor', 'Notes'];
  
  const csvRows: string[] = [];
  
  DAYS.forEach((day, dayIndex) => {
    const daySchedule = timetable.schedule[day as keyof Schedule];
    if (daySchedule && daySchedule.length > 0) {
      daySchedule.forEach(slot => {
        const row = [
          DAY_NAMES[dayIndex],
          slot.start_time,
          slot.end_time,
          `"${slot.subject.replace(/"/g, '""')}"`,
          slot.duration.toString(),
          slot.room ? `"${slot.room.replace(/"/g, '""')}"` : '',
          slot.instructor ? `"${slot.instructor.replace(/"/g, '""')}"` : '',
          slot.notes ? `"${slot.notes.replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      });
    }
  });

  if (csvRows.length === 0) {
    csvRows.push('No schedule data available,,,,,,,');
  }

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_timetable.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export timetable to iCalendar format (.ics) for calendar apps
export async function exportTimetableICS(timetable: Timetable, title: string = 'My Timetable'): Promise<void> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Get Monday

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aura Study//Timetable Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${title}`,
    'X-WR-TIMEZONE:UTC'
  ].join('\r\n');

  // Generate events for next 4 weeks
  for (let week = 0; week < 4; week++) {
    DAYS.forEach((day, dayIndex) => {
      const daySchedule = timetable.schedule[day as keyof Schedule];
      if (daySchedule && daySchedule.length > 0) {
        const eventDate = new Date(startOfWeek);
        eventDate.setDate(startOfWeek.getDate() + (week * 7) + dayIndex);
        
        daySchedule.forEach((slot, slotIndex) => {
          const startDateTime = new Date(eventDate);
          const endDateTime = new Date(eventDate);
          
          // Parse time
          const [startHour, startMinute] = slot.start_time.split(':').map(Number);
          const [endHour, endMinute] = slot.end_time.split(':').map(Number);
          
          startDateTime.setHours(startHour, startMinute, 0, 0);
          endDateTime.setHours(endHour, endMinute, 0, 0);
          
          const uid = `${eventDate.toISOString().split('T')[0]}-${day}-${slotIndex}@aurastudy.app`;
          const dtstart = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const dtend = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          
          icsContent += '\r\n' + [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${slot.subject}`,
            slot.room ? `LOCATION:${slot.room}` : '',
            slot.instructor ? `DESCRIPTION:Instructor: ${slot.instructor}${slot.notes ? '\\nNotes: ' + slot.notes : ''}` : (slot.notes ? `DESCRIPTION:${slot.notes}` : ''),
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT'
          ].filter(line => line).join('\r\n');
        });
      }
    });
  }

  icsContent += '\r\nEND:VCALENDAR';
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_timetable.ics`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export timetable to JSON format
export async function exportTimetableJSON(timetable: Timetable, title: string = 'My Timetable'): Promise<void> {
  // Calculate statistics
  const allSlots = DAYS.flatMap(day => timetable.schedule[day as keyof Schedule] || []);
  const totalHours = allSlots.reduce((sum, slot) => sum + (slot.duration / 60), 0);
  const subjectHours: Record<string, number> = {};
  
  allSlots.forEach(slot => {
    if (!subjectHours[slot.subject]) {
      subjectHours[slot.subject] = 0;
    }
    subjectHours[slot.subject] += slot.duration / 60;
  });

  const exportData = {
    title,
    exportedAt: new Date().toISOString(),
    mode: timetable.mode,
    settings: {
      preferred_study_time: timetable.preferred_study_time,
      hours_per_day: timetable.hours_per_day
    },
    subjects: timetable.subjects,
    schedule: timetable.schedule,
    statistics: {
      totalWeeklyHours: Math.round(totalHours * 100) / 100,
      totalSlots: allSlots.length,
      averageSlotDuration: allSlots.length > 0 
        ? Math.round((totalHours / allSlots.length) * 60) 
        : 0,
      subjectDistribution: Object.entries(subjectHours).map(([subject, hours]) => ({
        subject,
        weeklyHours: Math.round(hours * 100) / 100,
        percentage: Math.round((hours / totalHours) * 100)
      })).sort((a, b) => b.weeklyHours - a.weeklyHours),
      dailyBreakdown: DAYS.map((day, index) => {
        const daySlots = timetable.schedule[day as keyof Schedule] || [];
        const dayHours = daySlots.reduce((sum, slot) => sum + (slot.duration / 60), 0);
        return {
          day: DAY_NAMES[index],
          slots: daySlots.length,
          hours: Math.round(dayHours * 100) / 100,
          subjects: [...new Set(daySlots.map(s => s.subject))]
        };
      })
    },
    calendar: {
      // Generate next month's dates for easy calendar import
      upcomingEvents: (() => {
        const events = [];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        for (let week = 0; week < 4; week++) {
          DAYS.forEach((day, dayIndex) => {
            const daySchedule = timetable.schedule[day as keyof Schedule];
            if (daySchedule) {
              daySchedule.forEach(slot => {
                const eventDate = new Date();
                eventDate.setDate(eventDate.getDate() + (week * 7) + dayIndex);
                events.push({
                  date: eventDate.toISOString().split('T')[0],
                  day: DAY_NAMES[dayIndex],
                  subject: slot.subject,
                  startTime: slot.start_time,
                  endTime: slot.end_time,
                  duration: slot.duration
                });
              });
            }
          });
        }
        return events;
      })()
    }
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}_timetable.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export timetable to PDF format (using html2canvas + jsPDF)
export async function exportTimetablePDF(timetable: Timetable, title: string = 'My Timetable'): Promise<void> {
  // Import jsPDF and html2canvas dynamically
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);

  // Create off-screen container
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute; 
    left: -9999px; 
    top: -9999px; 
    width: 794px; 
    background: #ffffff; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    color: #1f2937;
    padding: 40px;
  `;

  // Calculate total hours
  const allSlots = DAYS.flatMap(day => timetable.schedule[day as keyof Schedule] || []);
  const totalHours = allSlots.reduce((sum, slot) => sum + (slot.duration / 60), 0);

  container.innerHTML = `
    <div style="margin-bottom: 30px; text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
      <h1 style="font-size: 24px; color: #1f2937; margin: 0 0 8px 0; font-weight: 700;">${title}</h1>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">
        Generated on ${new Date().toLocaleDateString()} • 
        ${totalHours.toFixed(1)} hours/week • 
        ${allSlots.length} time slots
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: 600;">Time</th>
          ${DAY_NAMES.map(day => `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 600;">${day}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${generateTimeTableRows(timetable).join('')}
      </tbody>
    </table>

    <div style="display: flex; gap: 30px;">
      <div style="flex: 1;">
        <h3 style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">📚 Subjects</h3>
        <div style="font-size: 11px;">
          ${timetable.subjects.map(subject => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
              <span>${subject.name}</span>
              <span style="color: #6b7280;">
                ${(allSlots.filter(s => s.subject === subject.name).reduce((sum, s) => sum + s.duration, 0) / 60).toFixed(1)}h/week
              </span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="flex: 1;">
        <h3 style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">📊 Weekly Overview</h3>
        <div style="font-size: 11px;">
          ${DAYS.map((day, index) => {
            const daySlots = timetable.schedule[day as keyof Schedule] || [];
            const dayHours = daySlots.reduce((sum, slot) => sum + (slot.duration / 60), 0);
            return `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6;">
                <span>${DAY_NAMES[index]}</span>
                <span style="color: #6b7280;">${daySlots.length} slots, ${dayHours.toFixed(1)}h</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
        <strong style="color: #1f2937;">Study Mode:</strong> ${timetable.mode === 'exam' ? 'Exam Preparation' : 'Regular Study'}<br>
        ${timetable.preferred_study_time ? `<strong style="color: #1f2937;">Preferred Time:</strong> ${timetable.preferred_study_time}<br>` : ''}
        ${timetable.hours_per_day ? `<strong style="color: #1f2937;">Target:</strong> ${timetable.hours_per_day} hours/day<br>` : ''}
        <strong style="color: #1f2937;">Generated by:</strong> Aura Study - AI Learning Platform
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title.replace(/[^a-z0-9]/gi, '_')}_timetable.pdf`);
    
  } finally {
    document.body.removeChild(container);
  }
}

// Helper function to generate time table rows
function generateTimeTableRows(timetable: Timetable): string[] {
  const timeSlots = new Set<string>();
  
  // Collect all unique time slots
  DAYS.forEach(day => {
    const daySchedule = timetable.schedule[day as keyof Schedule];
    if (daySchedule) {
      daySchedule.forEach(slot => {
        timeSlots.add(slot.start_time);
      });
    }
  });

  const sortedTimes = Array.from(timeSlots).sort();
  
  return sortedTimes.map(time => {
    const cells = DAYS.map(day => {
      const daySchedule = timetable.schedule[day as keyof Schedule];
      const slot = daySchedule?.find(s => s.start_time === time);
      
      if (slot) {
        return `<td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11px; background: #fef3c7;">
          <div style="font-weight: 600; color: #92400e; margin-bottom: 2px;">${slot.subject}</div>
          <div style="color: #78716c; font-size: 10px;">${slot.start_time} - ${slot.end_time}</div>
          ${slot.room ? `<div style="color: #78716c; font-size: 10px;">📍 ${slot.room}</div>` : ''}
        </td>`;
      } else {
        return `<td style="border: 1px solid #d1d5db; padding: 6px; background: #f9fafb;"></td>`;
      }
    });

    return `<tr>
      <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: 600; background: #f3f4f6; font-size: 11px;">${time}</td>
      ${cells.join('')}
    </tr>`;
  });
}