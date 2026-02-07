# CityPulse - Feature Testing Guide

## Test Credentials

### Citizens
- **Email**: citizen@citypulse.local
- **Username**: John Citizen
- **Role**: Citizen

### Field Staff
- **Email**: sarah@citypulse.local
- **Username**: Field Officer Sarah
- **Role**: Field Staff

### Officers
- **Email**: mike@citypulse.local
- **Username**: Officer Mike Chen
- **Role**: Officer

### Administrators
- **Email**: admin@citypulse.local
- **Username**: Admin Lisa Park
- **Role**: Admin

---

## Feature Testing Checklist

### 1. PHOTO UPLOAD IN INCIDENT REPORTING ✓

**Test Steps**:
1. Login as John Citizen
2. Click "Report Incident"
3. Fill in incident details
4. Click upload area and select multiple images
5. Preview images appear below
6. Submit report

**Expected Result**: Images are saved with ticket and visible in audit timeline

**Verify**:
- [ ] Multiple images can be uploaded
- [ ] Preview shows in grid format
- [ ] Delete button removes individual images
- [ ] Images persist after submission

---

### 2. DUPLICATE DETECTION ✓

**Test Steps**:
1. Login as John Citizen
2. Click "Report Incident"
3. Try to report a pothole on Main Street (similar to CYP-2024-001)
4. System detects duplicate
5. Shows "Similar Incidents Found" warning
6. Displays matching incident with similarity %

**Expected Result**: Duplicate detection prevents duplicate entries

**Verify**:
- [ ] Similar incidents are detected
- [ ] Similarity percentage is accurate (40%+)
- [ ] User can view matched incidents
- [ ] User can override and submit anyway
- [ ] Duplicate flag is saved with ticket

---

### 3. DETERMINISTIC STATE MACHINE ✓

**Test Steps**:
1. Login as Officer Mike Chen
2. Select an open ticket
3. Assign it to Sarah
4. Try to transition from "Assigned" to "Resolved" directly
5. System prevents invalid transition
6. Only shows valid options: "In Progress", "On Hold", "Closed"

**Expected Result**: Only valid state transitions are available

**Verify**:
- [ ] Invalid transitions are blocked
- [ ] Valid transitions show as buttons
- [ ] Transition changes status immediately
- [ ] Audit log records transition
- [ ] Hold reason appears for "On Hold" status
- [ ] Resolution notes appear for "Resolved" status

---

### 4. CITY-WIDE INCIDENT VIEW ✓

**Test Steps**:
1. Login as John Citizen
2. Click "View City-Wide Incidents"
3. See total incident count
4. See critical areas list
5. View resolution time average
6. Check duplicate rate

**Expected Result**: Comprehensive city overview with key metrics

**Verify**:
- [ ] Total incidents count is correct
- [ ] Critical areas are highlighted
- [ ] KPI cards show accurate data
- [ ] Map loads and shows incident markers
- [ ] All statistics update in real-time

---

### 5. GEOGRAPHIC MAPS & HEATMAPS ✓

**Test Steps**:
1. In City-Wide view, scroll to "Incident Distribution Map"
2. See incident markers on map
3. Click "Heatmap" button
4. View density visualization
5. Switch back to "Markers" view

**Expected Result**: Interactive map with both marker and heatmap views

**Verify**:
- [ ] Map shows all active incidents
- [ ] Markers are color-coded by severity
- [ ] Heatmap shows density gradients
- [ ] Toggle between views works smoothly
- [ ] Legend explains severity colors
- [ ] Critical incidents are highlighted

---

### 6. CHARTS & VISUALIZATIONS ✓

**Test Steps - City-Wide Charts**:
1. In City-Wide view, scroll to charts section
2. See Time Series Chart (7-day trends)
3. See Category Distribution (pie chart)
4. See Severity Distribution (bar chart)

**Expected Result**: Multiple interactive charts showing data trends

**Verify**:
- [ ] Time series shows incident reporting and resolution
- [ ] Category pie chart shows all types
- [ ] Severity bar chart compares levels
- [ ] Charts are responsive
- [ ] Hover shows data values
- [ ] Colors match severity indicators

---

### 7. FIELD STAFF INTERFACE ✓

**Test Steps**:
1. Login as Field Officer Sarah
2. See "My Assigned Tasks" page
3. Notice mobile-friendly large cards
4. Click "Map View" button
5. See tasks on geographic map
6. Click back to "List View"
7. Click on a task card
8. Enter detail view

**Expected Result**: Mobile-first field staff interface with map integration

**Verify**:
- [ ] Task cards are large (touch-friendly)
- [ ] Priority is visually indicated
- [ ] Status badges show current state
- [ ] Map view shows incident locations
- [ ] List and map views toggle smoothly
- [ ] Detail view opens full ticket info

---

### 8. FIELD STAFF TASK ACTIONS ✓

**Test Steps**:
1. Login as Field Officer Sarah
2. Open an "Assigned" task
3. Click "Accept & Start Work" button
4. Status changes to "In Progress"
5. Add a progress note in comments
6. Click "Status Update" buttons
7. Try transitioning to "On Hold"
8. Add hold reason if required
9. Transition to "Resolved"
10. Add resolution notes

**Expected Result**: Full workflow support with state transitions

**Verify**:
- [ ] Accept button works and changes status
- [ ] Progress notes are saved
- [ ] Status buttons only show valid transitions
- [ ] Hold reason is required for on_hold
- [ ] Resolution notes are captured
- [ ] All actions appear in audit timeline

---

### 9. OFFICER PERFORMANCE METRICS ✓

**Test Steps**:
1. Login as Admin Lisa Park
2. Click "Performance" tab
3. See officer cards with metrics:
   - Tasks assigned
   - Tasks completed
   - Average resolution time
   - On-time completion %
   - Overall rating
4. See performance comparison chart

**Expected Result**: Individual officer performance tracking

**Verify**:
- [ ] Each officer has a metrics card
- [ ] All KPIs display correctly
- [ ] Rating is calculated (0-5 stars)
- [ ] Comparison chart shows all officers
- [ ] Colors indicate performance levels
- [ ] Charts are sortable/filterable

---

### 10. BATCH PROCESSING ✓

**Test Steps**:
1. Login as Admin Lisa Park
2. Click "Batch Ops" tab
3. Select "Update Status" action
4. Choose new status (e.g., "Resolved")
5. Check tickets to process (select 3)
6. Click "Process" button
7. See success message

**Expected Result**: Bulk operations on multiple tickets

**Verify**:
- [ ] Action types are available (status, assign, category)
- [ ] Ticket selection works (checkboxes)
- [ ] New value selection works
- [ ] Batch processing completes
- [ ] Count shows processed items
- [ ] All tickets updated in list
- [ ] Audit logs record batch action

---

### 11. COMPLIANCE & AUDIT LOGGING ✓

**Test Steps**:
1. Login as Admin Lisa Park
2. Click "Compliance" tab
3. See recent actions list
4. Review field changes (old → new)
5. Check actor identification (name & role)
6. Click "Export JSON Report" button
7. File downloads

**Expected Result**: Complete audit trail and compliance reporting

**Verify**:
- [ ] All actions are logged
- [ ] Timestamps are accurate
- [ ] Field changes show old and new values
- [ ] Actors are identified with roles
- [ ] Export creates valid JSON
- [ ] JSON contains all data
- [ ] Date filtering works

---

### 12. RESPONSIVE MOBILE DESIGN ✓

**Test Steps**:
1. Open browser dev tools
2. Select iPhone 12 mobile device
3. Test each role as mobile user

**For Citizens**:
- [ ] Report button is accessible
- [ ] Form fields stack vertically
- [ ] Upload area is touch-friendly
- [ ] My Reports list is readable
- [ ] City-wide map is fullscreen

**For Field Staff**:
- [ ] Task cards display well
- [ ] Status buttons are large
- [ ] Map view is full width
- [ ] Navigation is hamburger menu
- [ ] Detail view is scrollable

**For Admin**:
- [ ] Tabs are accessible
- [ ] Charts are responsive
- [ ] Batch selection works
- [ ] Export button is visible
- [ ] All data is readable

---

### 13. INDIAN UX TOUCHES ✓

**Test Steps**:
1. Login as Field Officer Sarah
2. Read greeting message at top
3. Notice respectful tone in labels
4. Check for culturally appropriate status messages
5. Review incident categories (relevant to India)

**Expected Result**: Culturally localized UX

**Verify**:
- [ ] नमस्ते greeting appears
- [ ] Formal titles are used
- [ ] Context-aware messaging
- [ ] Categories reflect Indian infrastructure
- [ ] Responsive to community needs

---

### 14. INTEGRATION TESTING ✓

**Complete Workflow Test**:

1. **Citizen Reports**:
   - Login as John Citizen
   - Create new incident with photo
   - System checks for duplicates
   - Submit report successfully
   - View in "My Reports"
   - Check status progression

2. **Officer Assigns**:
   - Login as Officer Mike Chen
   - See newly reported incident
   - Assign to Field Officer Sarah
   - Add comment about assignment
   - Check audit log

3. **Field Staff Executes**:
   - Login as Field Officer Sarah
   - See assigned task
   - View on map
   - Accept task
   - Add progress notes
   - Update to "In Progress"
   - Mark as resolved

4. **Admin Reviews**:
   - Login as Admin Lisa Park
   - Check performance metrics
   - View on analytics dashboard
   - Export compliance report
   - Verify audit trail

---

### 15. DATA VALIDATION ✓

**Test Invalid Inputs**:
- [ ] Required fields cannot be empty
- [ ] Coordinates must be valid numbers
- [ ] Images must be PNG/JPG/GIF
- [ ] File size must be < 10MB
- [ ] Status transitions are validated
- [ ] Severity options are limited
- [ ] Category options are limited

---

## Performance Testing

### Page Load Times
- [ ] Homepage loads in < 2 seconds
- [ ] Dashboard loads in < 3 seconds
- [ ] Maps render in < 2 seconds
- [ ] Charts load in < 1 second

### Responsiveness
- [ ] No visual lag when scrolling
- [ ] Button clicks are instant
- [ ] Form submission is quick
- [ ] Data updates in < 500ms

---

## Browser Compatibility

Test in:
- [ ] Chrome/Chromium (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Edge (Latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility Testing

- [ ] All buttons have proper labels
- [ ] Color contrast is sufficient (WCAG AA)
- [ ] Keyboard navigation works
- [ ] Screen readers can read content
- [ ] Focus states are visible
- [ ] Forms are properly labeled

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No broken links
- ✅ Proper error messages
- ✅ Data persists correctly
- ✅ Audit logs are complete
- ✅ Performance is smooth
- ✅ Mobile experience is excellent

---

## Known Limitations & Future Enhancements

1. **Maps**: Currently simulated with grid overlay
   - Future: Integration with Google Maps API

2. **Real-time Updates**: Uses localStorage polling
   - Future: WebSocket for true real-time

3. **Photo Storage**: Base64 in localStorage
   - Future: Cloud storage (AWS S3, Cloudinary)

4. **Authentication**: Simple role-based selection
   - Future: OAuth2 with Supabase

5. **Notifications**: No push notifications
   - Future: Email and SMS alerts

---

## Troubleshooting

### Issue: Data not persisting
**Solution**: Check browser localStorage is enabled

### Issue: Map not showing
**Solution**: Coordinates must be numeric and valid

### Issue: State transition blocked
**Solution**: Review valid transitions in state-machine.ts

### Issue: Performance slow
**Solution**: Clear localStorage and refresh

---

## Support

For issues or questions:
1. Check ENHANCEMENTS.md for feature details
2. Review GUIDE.md for user instructions
3. Check console for error messages
4. Verify test data is initialized

---

Happy testing! 🎉
