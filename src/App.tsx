import { useDeferredValue, useEffect, useLayoutEffect, useState } from 'react'
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, Check, ChevronRight, CircleCheck, Clock3, DatabaseBackup, FileText, LayoutList, LoaderCircle, MapPin, MessageSquare, Moon, Pencil, Plus, Search, ShieldCheck, Sprout, Sun, Trash2, X } from 'lucide-react'
import { statuses } from '../shared/schema'
import type { Application, Interview } from '../shared/schema'
import { errorMessage, fetchWorkspace, formatDate, formatSalary, isActive, today } from './lib'
import { Dialog } from './components/Dialog'
import { ApplicationForm, DeleteDialog, InterviewForm } from './components/Forms'

type View = 'Applications' | 'Interviews' | 'Insights'
type Modal = { type: 'application'; application?: Application } | { type: 'interview'; application: Application; interview?: Interview } | { type: 'delete'; application: Application; interview?: Interview }

function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase().replaceAll(' ', '-')}`}><span />{value}</span>
}

function CompanyMark({ company }: { company: string }) {
  const color = [...company].reduce((total, letter) => total + letter.charCodeAt(0), 0) % 4
  return <span className={`company-mark mark-${color}`} aria-hidden="true">{company.slice(0, 2).toUpperCase()}</span>
}

export default function App() {
  const [workspace, setWorkspace] = useState<{ applications: Application[]; interviews: Interview[] }>({ applications: [], interviews: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [view, setView] = useState<View>('Applications')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [sort, setSort] = useState('newest')
  const [interviewFilter, setInterviewFilter] = useState('All interviews')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [toast, setToast] = useState('')
  const [currentDate, setCurrentDate] = useState(today)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('nextstep-theme')
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch { return 'light' }
  })
  const { applications, interviews } = workspace
  const selected = applications.find(application => application.id === selectedId)
  const upcoming = interviews.filter(interview => interview.outcome === 'Scheduled' && interview.date >= currentDate && applications.some(application => application.id === interview.applicationId && isActive(application)))
  const followUps = applications.filter(application => application.followUpOn && isActive(application)).sort((first, second) => first.followUpOn.localeCompare(second.followUpOn))

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171d1a' : '#176b57')
    try { localStorage.setItem('nextstep-theme', theme) }
    catch { return }
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    fetchWorkspace(controller.signal).then(data => { setWorkspace(data); setLoading(false) }).catch(error => {
      if (!controller.signal.aborted) { setError(errorMessage(error)); setLoading(false) }
    })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(today()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  async function saved(message: string) {
    setToast(message)
    try { setWorkspace(await fetchWorkspace()); setError('') }
    catch { setError('Your change was saved, but the list could not refresh. Please retry.') }
  }

  function changeView(next: View) {
    setView(next)
    setSearch('')
  }

  const query = deferredSearch.toLocaleLowerCase().trim()
  const visible = applications.filter(application =>
    (statusFilter === 'All statuses' || application.status === statusFilter) &&
    [application.company, application.role, application.location, application.notes, application.contactName, application.jobListingText].some(value => value.toLocaleLowerCase().includes(query)),
  ).sort((first, second) => sort === 'company' ? first.company.localeCompare(second.company) : sort === 'oldest' ? first.appliedOn.localeCompare(second.appliedOn) || first.id - second.id : second.appliedOn.localeCompare(first.appliedOn) || second.id - first.id)
  const visibleInterviews = interviews.filter(interview => {
    const application = applications.find(item => item.id === interview.applicationId)
    return application && (interviewFilter === 'All interviews' || (interviewFilter === 'Scheduled' ? interview.outcome === 'Scheduled' : interview.outcome !== 'Scheduled')) &&
      [application.company, application.role, interview.stage, interview.questions, interview.notes].some(value => value.toLocaleLowerCase().includes(query))
  })
  const stats = [
    { label: 'Total applications', value: applications.length, icon: BriefcaseBusiness, color: 'green', note: `${applications.filter(isActive).length} active` },
    { label: 'Interviewing', value: applications.filter(application => application.status === 'Interviewing').length, icon: MessageSquare, color: 'blue', note: `${upcoming.length} upcoming interviews` },
    { label: 'Offers received', value: applications.filter(application => ['Offer', 'Accepted'].includes(application.status)).length, icon: CircleCheck, color: 'gold', note: `${applications.filter(application => application.status === 'Accepted').length} accepted` },
    { label: 'Follow-ups due', value: followUps.filter(application => application.followUpOn <= currentDate).length, icon: Clock3, color: 'rose', note: 'Today & overdue' },
  ]

  return <div className="workspace">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Nextstep home"><span className="brand-mark"><Sprout size={25} /></span>nextstep<span className="brand-period">.</span></a>
      <div className="workspace-label"><span className="workspace-avatar">P</span><div>Personal workspace<small>Job search</small></div></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        {([{ name: 'Applications', icon: LayoutList }, { name: 'Interviews', icon: CalendarDays }, { name: 'Insights', icon: ChartNoAxesCombined }] as const).map(item => <button key={item.name} className={`nav-item ${view === item.name ? 'active' : ''}`} onClick={() => changeView(item.name)} aria-current={view === item.name ? 'page' : undefined}><item.icon size={18} /><span>{item.name}</span>{item.name === 'Applications' && <span className="nav-count">{applications.length}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom"><a className="nav-item" href="/api/backup" download title="Download database backup"><DatabaseBackup size={18} /><span>Download backup</span></a><div className="local-indicator"><ShieldCheck size={15} /><span>Local workspace</span><span className="connection-dot" /></div></div>
    </aside>

    <div className="page">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{view}</strong></div><div className="topbar-actions"><div className="topbar-date"><CalendarDays size={15} />{formatDate(currentDate, true)}</div><button className="icon-button theme-toggle" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>
      <main id="main">
        <section className="page-heading"><div><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>{view}</h1></div><div className="heading-actions">{view !== 'Insights' && <a className="button secondary export-button" title="Export CSV" aria-label="Export CSV" href={`/api/export/${view === 'Interviews' ? 'interviews' : 'applications'}.csv`} download><ArrowDownToLine size={16} /><span>Export CSV</span></a>}<button className="button primary" onClick={() => setModal({ type: 'application' })}><Plus size={18} /><span>Add application</span></button></div></section>

        <section className="stats" aria-label="Application summary">{stats.map(stat => <div className="stat" key={stat.label}><div className="stat-label">{stat.label}<stat.icon size={17} className={`text-${stat.color}`} /></div><strong>{loading ? '-' : stat.value.toString().padStart(2, '0')}</strong><small>{stat.note}</small></div>)}</section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button className="text-button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1) }}>Retry</button></div>}
        {loading ? <div className="loading" role="status"><LoaderCircle className="spin" />Loading your workspace...</div> : <div className="content-layout">
          <section className="main-section">
            {view !== 'Insights' && <div className="toolbar"><div className="search-input"><Search size={17} /><input aria-label={view === 'Applications' ? 'Search applications' : 'Search interviews'} placeholder={view === 'Applications' ? 'Search company, role, or notes...' : 'Search company, questions, or notes...'} value={search} onChange={event => setSearch(event.target.value)} />{search && <button className="icon-button" title="Clear search" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}</div>{view === 'Applications' ? <><select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}</select><select aria-label="Sort applications" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="company">Company A-Z</option></select></> : <select aria-label="Filter interviews" value={interviewFilter} onChange={event => setInterviewFilter(event.target.value)}>{['All interviews', 'Scheduled', 'Past outcomes'].map(filter => <option key={filter}>{filter}</option>)}</select>}</div>}

            {view === 'Applications' && <>
              {visible.length ? <div className="table-scroll"><table className="applications-table"><thead><tr><th>Company & role</th><th>Status</th><th className="hide-small">Applied</th><th className="hide-medium">Salary expectation</th><th><span className="sr-only">Open application</span></th></tr></thead><tbody>{visible.map(application => <tr key={application.id}>
                <td><div className="company-cell"><CompanyMark company={application.company} /><div><button className="company-link" onClick={() => setSelectedId(application.id)}>{application.company}</button><span className="role-name">{application.role}</span>{application.location && <span className="location-name"><MapPin size={11} />{application.location}</span>}</div></div></td>
                <td><Status value={application.status} />{application.stage !== 'Not started' && <span className="stage-name">{application.stage}</span>}</td>
                <td className="hide-small date-cell">{formatDate(application.appliedOn, true)}</td><td className="hide-medium salary-cell">{formatSalary(application)}</td>
                <td><button className="icon-button" title={`Open ${application.company}`} aria-label={`Open ${application.company}`} onClick={() => setSelectedId(application.id)}><ArrowUpRight size={17} /></button></td>
              </tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={32} strokeWidth={1.4} /></div><h2>{applications.length ? 'No matching applications' : 'Your next step starts here'}</h2>{applications.length ? <button className="text-button" onClick={() => { setSearch(''); setStatusFilter('All statuses') }}>Clear filters</button> : <button className="button primary" onClick={() => setModal({ type: 'application' })}><Plus size={17} />Add your first application</button>}</div>}
              <div className="table-footer"><span>{visible.length} of {applications.length} applications</span></div>
            </>}

            {view === 'Interviews' && <>
              <div className="section-title"><h2>Interview history</h2><span className="count-label">{visibleInterviews.length} interviews</span></div>
              {visibleInterviews.length ? <div className="interview-list">{visibleInterviews.map(interview => {
                const application = applications.find(item => item.id === interview.applicationId)!
                return <article className="interview-row" key={interview.id}><div className="date-tile"><span>{new Date(`${interview.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span><strong>{Number(interview.date.slice(8))}</strong></div><div className="interview-content"><div className="interview-title"><button className="company-link" onClick={() => setSelectedId(application.id)}>{application.company}</button><Status value={interview.outcome} /></div><h3>{interview.stage}</h3><p>{application.role}{interview.time && ` / ${interview.time}`}</p>{interview.questions && <p className="question-preview">{interview.questions}</p>}</div><button className="icon-button" title="Edit interview" aria-label={`Edit interview at ${application.company}`} onClick={() => setModal({ type: 'interview', application, interview })}><Pencil size={16} /></button></article>
              })}</div> : <div className="empty-state"><div className="empty-icon"><CalendarDays size={32} strokeWidth={1.4} /></div><h2>No interviews {query || interviewFilter !== 'All interviews' ? 'match these filters' : 'yet'}</h2><button className="text-button" onClick={() => changeView('Applications')}>Go to applications<ArrowRight size={16} /></button></div>}
            </>}

            {view === 'Insights' && <div className="insights"><div className="section-title"><h2>Application pipeline</h2><span className="count-label">All time</span></div><div className="pipeline">{statuses.map(status => {
              const count = applications.filter(application => application.status === status).length
              return <div className="pipeline-row" key={status}><Status value={status} /><div className="bar-track"><div className={`bar-fill bar-${status.toLowerCase()}`} style={{ width: `${applications.length ? count / applications.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>
            })}</div><div className="insight-summary"><div><MessageSquare size={21} /><strong>{interviews.length}</strong><span>Interview rounds</span></div><div><FileText size={21} /><strong>{interviews.filter(interview => interview.questions.trim()).length}</strong><span>Rounds with questions</span></div><div><Check size={21} /><strong>{interviews.filter(interview => ['Completed', 'Passed'].includes(interview.outcome)).length}</strong><span>Completed rounds</span></div></div></div>}
          </section>

          <aside className="agenda"><div className="section-title"><h2>Coming up</h2><CalendarDays size={17} /></div>{upcoming.length ? <div className="agenda-list">{upcoming.slice(0, 5).map(interview => {
            const application = applications.find(item => item.id === interview.applicationId)!
            return <button className="agenda-item" key={interview.id} onClick={() => setSelectedId(application.id)}><span className="agenda-date">{formatDate(interview.date)}{interview.time && <span>{interview.time}</span>}</span><strong>{application.company}</strong><span>{interview.stage}</span></button>
          })}</div> : <div className="agenda-empty"><CalendarDays size={25} strokeWidth={1.4} /><p>No upcoming interviews</p></div>}
            <div className="section-title followup-title"><h2>Follow-ups</h2><Clock3 size={17} /></div>{followUps.length ? <div className="agenda-list">{followUps.slice(0, 5).map(application => <button className="agenda-item" key={application.id} onClick={() => setSelectedId(application.id)}><span className={`agenda-date ${application.followUpOn < currentDate ? 'overdue' : ''}`}>{application.followUpOn === currentDate ? 'Today' : formatDate(application.followUpOn, true)}{application.followUpOn < currentDate && <span>Overdue</span>}</span><strong>{application.company}</strong><span>{application.role}</span></button>)}</div> : <div className="agenda-empty"><CircleCheck size={25} strokeWidth={1.4} /><p>No follow-ups scheduled</p></div>}
          </aside>
        </div>}
        <footer className="page-footer"><span>One application at a time.</span><span>nextstep.</span></footer>
      </main>
    </div>

    {selected && <Dialog title={selected.company} subtitle={selected.role} wide onClose={() => setSelectedId(null)}>
      <div className="detail-actions"><Status value={selected.status} /><div className="button-group"><button className="button secondary" onClick={() => setModal({ type: 'application', application: selected })}><Pencil size={15} />Edit</button><button className="icon-button danger-text" title="Delete application" aria-label="Delete application" onClick={() => setModal({ type: 'delete', application: selected })}><Trash2 size={17} /></button></div></div>
      <div className="detail-body"><dl className="detail-grid"><div><dt>Applied</dt><dd>{formatDate(selected.appliedOn, true)}</dd></div><div><dt>Current stage</dt><dd>{selected.stage}</dd></div><div><dt>Salary expectation</dt><dd>{formatSalary(selected)}</dd></div><div><dt>Location</dt><dd>{selected.location || 'Not specified'}</dd></div><div><dt>Follow-up</dt><dd>{formatDate(selected.followUpOn, true)}</dd></div><div><dt>Contact</dt><dd>{selected.contactName || 'Not specified'}{selected.contactEmail && <a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a>}</dd></div></dl>{selected.jobUrl && <a className="text-button job-link" href={selected.jobUrl} target="_blank" rel="noopener noreferrer">View job posting<ArrowUpRight size={15} /></a>}
        <section className="notes-section"><h3>Saved job listing</h3>{selected.jobListingText && <p className="preserve-whitespace">{selected.jobListingText}</p>}{selected.jobListingScreenshot && <img className="saved-listing-image" src={selected.jobListingScreenshot} alt="Saved job listing screenshot" />}</section>
        {selected.notes && <section className="notes-section"><h3>Application notes</h3><p className="preserve-whitespace">{selected.notes}</p></section>}
        <section className="history-section"><div className="section-title"><h3>Interview history <span className="count-label">{interviews.filter(interview => interview.applicationId === selected.id).length}</span></h3><button className="button secondary" onClick={() => setModal({ type: 'interview', application: selected })}><Plus size={16} />Add interview</button></div>
          {interviews.filter(interview => interview.applicationId === selected.id).sort((first, second) => second.date.localeCompare(first.date) || second.time.localeCompare(first.time) || second.id - first.id).map(interview => <article className="history-entry" key={interview.id}><header><div><h4>{interview.stage}</h4><p>{formatDate(interview.date, true)}{interview.time && ` / ${interview.time}`}{interview.interviewer && ` / ${interview.interviewer}`}</p></div><div className="button-group"><Status value={interview.outcome} /><button className="icon-button" title="Edit interview" aria-label="Edit interview" onClick={() => setModal({ type: 'interview', application: selected, interview })}><Pencil size={15} /></button><button className="icon-button danger-text" title="Delete interview" aria-label="Delete interview" onClick={() => setModal({ type: 'delete', application: selected, interview })}><Trash2 size={15} /></button></div></header>{interview.questions && <div className="interview-notes"><h5>Questions</h5><p className="preserve-whitespace">{interview.questions}</p></div>}{interview.notes && <div className="interview-notes"><h5>Answers & notes</h5><p className="preserve-whitespace">{interview.notes}</p></div>}</article>)}
          {!interviews.some(interview => interview.applicationId === selected.id) && <div className="history-empty"><MessageSquare size={22} /><p>No interviews recorded</p></div>}
        </section>
      </div>
    </Dialog>}

    {modal?.type === 'application' && <ApplicationForm application={modal.application} onClose={() => setModal(null)} onSaved={saved} />}
    {modal?.type === 'interview' && <InterviewForm application={modal.application} interview={modal.interview} onClose={() => setModal(null)} onSaved={saved} />}
    {modal?.type === 'delete' && <DeleteDialog title={modal.interview ? 'Delete this interview?' : `Delete ${modal.application.company}?`} description={modal.interview ? 'This interview and its questions and notes will be permanently deleted.' : 'This application and all its interviews, questions, and notes will be permanently deleted.'} path={`/applications/${modal.application.id}${modal.interview ? `/interviews/${modal.interview.id}` : ''}`} onClose={() => setModal(null)} onSaved={saved} onDeleted={() => { if (!modal.interview) setSelectedId(null) }} />}
    {toast && <div className="toast" role="status"><CircleCheck size={18} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" title="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}
