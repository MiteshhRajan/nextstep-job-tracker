import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Check, LoaderCircle, Trash2 } from 'lucide-react'
import { applicationSchema, currencies, interviewSchema, statuses, stages, salaryPeriods, outcomes } from '../../shared/schema'
import type { Application, ApplicationInput, Interview, InterviewInput } from '../../shared/schema'
import { api, errorMessage, today } from '../lib'
import { Dialog } from './Dialog'

function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return <label className={`field ${full ? 'full-width' : ''}`}><span>{label}</span>{children}</label>
}

type FormProps = { onClose: () => void; onSaved: (message: string) => Promise<void> }

export function ApplicationForm({ application, onClose, onSaved }: FormProps & { application?: Application }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [jobListingScreenshot, setJobListingScreenshot] = useState(application?.jobListingScreenshot || '')
  const [screenshotName, setScreenshotName] = useState('')

  function chooseScreenshot(file: File | undefined) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Screenshot must be a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be 5 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setJobListingScreenshot(typeof reader.result === 'string' ? reader.result : '')
      setScreenshotName(file.name)
      setError('')
    }
    reader.onerror = () => setError('The screenshot could not be read. Please try again.')
    reader.readAsDataURL(file)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setError('')
    const parsed = applicationSchema.safeParse({ ...data, salary: data.salary === '' ? null : Number(data.salary), jobListingScreenshot })
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join('. ')); return }
    setBusy(true)
    try {
      await api<ApplicationInput>(application ? `/applications/${application.id}` : '/applications', { method: application ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) })
      await onSaved(application ? 'Application updated' : 'Application added')
      onClose()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <Dialog title={application ? 'Edit application' : 'New application'} subtitle={application?.company} onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="form-body">
        {error && <div className="error-banner" role="alert">{error}</div>}
        <fieldset disabled={busy} className="form-grid">
          <legend>Position</legend>
          <Field label="Company *"><input name="company" defaultValue={application?.company} required maxLength={200} placeholder="Company or institution" autoFocus /></Field>
          <Field label="Role *"><input name="role" defaultValue={application?.role} required maxLength={200} placeholder="e.g. Research Scientist" /></Field>
          <Field label="Date applied *"><input name="appliedOn" type="date" defaultValue={application?.appliedOn || today()} required /></Field>
          <Field label="Location"><input name="location" defaultValue={application?.location} maxLength={200} placeholder="City, country or remote" /></Field>
          <Field label="Status"><select name="status" defaultValue={application?.status || 'Applied'}>{statuses.map(status => <option key={status}>{status}</option>)}</select></Field>
          <Field label="Current stage"><select name="stage" defaultValue={application?.stage || 'Not started'}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></Field>
          <Field label="Job posting" full><input name="jobUrl" type="url" defaultValue={application?.jobUrl} maxLength={2000} placeholder="https://" /></Field>
        </fieldset>
        <fieldset disabled={busy} className="form-grid">
          <legend>Salary expectation mentioned</legend>
          <Field label="Amount"><input name="salary" type="number" min="0" max="1000000000" step="0.01" defaultValue={application?.salary ?? ''} placeholder="Not mentioned" /></Field>
          <div className="form-grid salary-controls">
            <Field label="Currency"><select name="currency" defaultValue={application?.currency || 'USD'}>{currencies.map(currency => <option key={currency}>{currency}</option>)}</select></Field>
            <Field label="Per"><select name="salaryPeriod" defaultValue={application?.salaryPeriod || 'year'}>{salaryPeriods.map(period => <option key={period} value={period}>{period}</option>)}</select></Field>
          </div>
        </fieldset>
        <fieldset disabled={busy} className="form-grid listing-archive">
          <legend>Job listing archive *</legend>
          <p className="field-help full-width">Save the listing before it disappears. Paste the description, upload a screenshot, or do both.</p>
          <Field label="Copied job description" full><textarea name="jobListingText" rows={7} defaultValue={application?.jobListingText} maxLength={50000} placeholder="Paste the job description here..." /></Field>
          <Field label="Screenshot (PNG, JPEG, or WebP)" full>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => chooseScreenshot(event.currentTarget.files?.[0])} />
            <input type="hidden" name="jobListingScreenshot" value={jobListingScreenshot} readOnly />
            <small className="field-help">{screenshotName || (application?.jobListingScreenshot ? 'Saved screenshot will be kept unless replaced.' : 'Maximum 5 MB.')}</small>
            {jobListingScreenshot && <img className="screenshot-preview" src={jobListingScreenshot} alt="Saved job listing preview" />}
          </Field>
        </fieldset>
        <fieldset disabled={busy} className="form-grid">
          <legend>Contact & notes</legend>
          <Field label="Contact name"><input name="contactName" defaultValue={application?.contactName} maxLength={200} /></Field>
          <Field label="Contact email"><input name="contactEmail" type="email" defaultValue={application?.contactEmail} maxLength={320} /></Field>
          <Field label="Follow-up date"><input name="followUpOn" type="date" defaultValue={application?.followUpOn} /></Field>
          <Field label="Notes" full><textarea name="notes" rows={4} defaultValue={application?.notes} maxLength={20000} placeholder="Research interests, conversations, things to remember..." /></Field>
        </fieldset>
      </div>
      <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} {busy ? 'Saving...' : 'Save application'}</button></footer>
    </form>
  </Dialog>
}

export function InterviewForm({ application, interview, onClose, onSaved }: FormProps & { application: Application; interview?: Interview }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = interviewSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join('. ')); return }
    setBusy(true)
    setError('')
    try {
      const path = `/applications/${application.id}/interviews${interview ? `/${interview.id}` : ''}`
      await api<InterviewInput>(path, { method: interview ? 'PUT' : 'POST', body: JSON.stringify(parsed.data) })
      await onSaved(interview ? 'Interview updated' : 'Interview added')
      onClose()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <Dialog title={interview ? 'Edit interview' : 'New interview'} subtitle={`${application.company} / ${application.role}`} onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="form-body">
        {error && <div className="error-banner" role="alert">{error}</div>}
        <fieldset disabled={busy} className="form-grid">
          <legend>Interview details</legend>
          <Field label="Stage *"><select name="stage" defaultValue={interview?.stage || (application.stage === 'Not started' ? 'Recruiter screen' : application.stage)}>{stages.filter(stage => stage !== 'Not started').map(stage => <option key={stage}>{stage}</option>)}</select></Field>
          <Field label="Outcome"><select name="outcome" defaultValue={interview?.outcome || 'Scheduled'}>{outcomes.map(outcome => <option key={outcome}>{outcome}</option>)}</select></Field>
          <Field label="Date *"><input name="date" type="date" defaultValue={interview?.date || today()} required /></Field>
          <Field label="Time (local)"><input name="time" type="time" defaultValue={interview?.time} /></Field>
          <Field label="Interviewer" full><input name="interviewer" defaultValue={interview?.interviewer} maxLength={200} /></Field>
          <Field label="Interview questions" full><textarea name="questions" rows={5} defaultValue={interview?.questions} maxLength={20000} placeholder="Questions asked, one per line..." /></Field>
          <Field label="Answers & notes" full><textarea name="notes" rows={5} defaultValue={interview?.notes} maxLength={20000} placeholder="Your answers, feedback, and preparation notes..." /></Field>
        </fieldset>
      </div>
      <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} {busy ? 'Saving...' : 'Save interview'}</button></footer>
    </form>
  </Dialog>
}

export function DeleteDialog({ title, description, path, onClose, onSaved, onDeleted }: FormProps & { title: string; description: string; path: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    setBusy(true)
    try {
      await api<void>(path, { method: 'DELETE' })
      await onSaved('Record deleted')
      onDeleted()
      onClose()
    } catch (error) { setError(errorMessage(error)); setBusy(false) }
  }
  return <Dialog title={title} onClose={onClose} busy={busy}>
    <div className="form-body"><p>{description}</p>{error && <p className="error-banner" role="alert">{error}</p>}</div>
    <footer className="dialog-footer"><button className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button danger" onClick={remove} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}Delete permanently</button></footer>
  </Dialog>
}