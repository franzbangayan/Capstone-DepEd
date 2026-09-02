import '../styles/TeachersPage.css'
import { useState } from 'react'
import { IconSearch, IconChevronDown, IconPlus, IconEdit, IconTrash } from '../components/Icons'
import TeacherFormModal from '../components/TeacherFormModal'


// Not yet connected to te backend

const TeachersPage = () => {
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showModal,    setShowModal]    = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)

  const openAdd = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const openEdit = (teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTeacher(null)
  }

  return (
    <div className="screen stack">

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <IconSearch />
          <input
            className="input"
            type="text"
            placeholder="Search by name or specialization…"
            value={search}
            onChange={(e) => { setSearch(e.target.value) }}
          />
        </div>

        <div className="select-wrap">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value) }}
          >
            <option>All</option>
            <option>Permanent</option>
            <option>Provisional</option>
            <option>Part-time</option>
          </select>
          <IconChevronDown />
        </div>

        <button className="btn btn-primary" onClick={openAdd}>
          <IconPlus /> Add Teacher
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Last Name</th>
                <th>First Name</th>
                  <th>Middle Name</th>
              <th>Status</th>
              <th>Max Load</th>
              <th>Specializations</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="table-empty-cell">
                No teachers added yet. Click &quot;Add Teacher&quot; to get started.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="table-footer">
          <span className="table-count">Showing 0 teachers</span>
          <div className="pagination">
            <button className="page-btn" disabled>Previous</button>
            <button className="page-num active">1</button>
            <button className="page-btn" disabled>Next</button>
          </div>
        </div>
      </div>

      {showModal && (
        <TeacherFormModal teacher={editingTeacher} onClose={closeModal} />
      )}

    </div>
  )
}

export default TeachersPage
