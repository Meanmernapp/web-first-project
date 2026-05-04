import { useState, useEffect, useMemo } from 'react';
import Select, { StylesConfig, ThemeConfig } from 'react-select';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import Header from '@/components/Header';

const selectTheme: ThemeConfig = (theme) => ({
    ...theme,
    borderRadius: 8,
    colors: {
        ...theme.colors,
        primary: '#38bdf8',
        primary25: 'rgba(56, 189, 248, 0.12)',
        primary50: 'rgba(56, 189, 248, 0.2)',
        neutral0: '#18181b',
        neutral5: '#121214',
        neutral10: '#27272a',
        neutral20: '#3f3f46',
        neutral30: '#52525b',
        neutral40: '#71717a',
        neutral50: '#a1a1aa',
        neutral60: '#d4d4d8',
        neutral70: '#e4e4e7',
        neutral80: '#fafafa',
        neutral90: '#fafafa',
    },
});

const selectStyles: StylesConfig<{ value: string; label: string }, true> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#121214',
        borderColor: state.isFocused ? '#38bdf8' : '#27272a',
        boxShadow: state.isFocused ? '0 0 0 1px #38bdf8' : 'none',
        minHeight: 42,
        '&:hover': { borderColor: '#3f3f46' },
    }),
    menuList: (base) => ({ ...base, padding: 4 }),
    menu: (base) => ({
        ...base,
        backgroundColor: '#18181b',
        border: '1px solid #27272a',
        boxShadow: '0 12px 40px -12px rgba(0,0,0,0.5)',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? '#27272a' : 'transparent',
        color: '#fafafa',
        cursor: 'pointer',
        borderRadius: 6,
    }),
    multiValue: (base) => ({
        ...base,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderRadius: 6,
    }),
    multiValueLabel: (base) => ({ ...base, color: '#e0f2fe' }),
    multiValueRemove: (base) => ({
        ...base,
        color: '#7dd3fc',
        ':hover': { backgroundColor: 'rgba(56, 189, 248, 0.25)', color: '#fff' },
    }),
    input: (base) => ({ ...base, color: '#fafafa' }),
    placeholder: (base) => ({ ...base, color: '#71717a' }),
    singleValue: (base) => ({ ...base, color: '#fafafa' }),
    indicatorsContainer: (base) => ({ ...base }),
    dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? '#38bdf8' : '#71717a',
        ':hover': { color: '#38bdf8' },
    }),
    clearIndicator: (base) => ({ ...base, color: '#71717a', ':hover': { color: '#fafafa' } }),
};

interface Project {
    budgetHours?: any;
    _id: string;
    name: string;
    status?: string;
    contractType?: string;
    periodOfPerformance?: {
        startDate: Date;
        endDate: Date;
    };
    description?: string;
    pm?: string;
}

interface Group {
    _id: string;
    name: string;
    projectIds: string[];
}

export default function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [groupName, setGroupName] = useState<string>('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null); // Stores the group ID if editing

    // Fetch all projects
    useEffect(() => {
        async function fetchProjects() {
            try {
                const response = await fetch(`/api/projects`, {
                    headers: {
                        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
                    },
                });
                if (!response.ok) throw new Error('Failed to fetch project info');
                const data: Project[] = await response.json();

                setProjects(data);
            } catch (error) {
                console.error("Error fetching projects:", error);
            }
        }
        fetchProjects();
    }, []);

    // Fetch all groups
    useEffect(() => {
        async function fetchGroups() {
            try {
                const response = await fetch(`/api/groups`, {
                    headers: {
                        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
                    },
                });
                if (!response.ok) throw new Error('Failed to fetch groups');
                const data: Group[] = await response.json();
                setGroups(data);
            } catch (error) {
                console.error("Error fetching groups:", error);
            }
        }
        fetchGroups();
    }, []);

    // Handle selecting and deselecting projects using react-select
    const handleSelect = (selectedOptions: any) => {
        // const selectedIds = selectedOptions ? selectedOptions.map((option: any) => option.label) : [];
        setSelectedProjects(selectedOptions);
    };

    // Handle creating or updating a group
    const handleSaveGroup = async () => {
        const selectProject = projects.filter((item) =>
            selectedProjects.find((select: any) => select.value === item._id)
        );

        if (selectProject.length > 0) {
            const firstBudgetHours = selectProject[0].budgetHours;
            const firstStartDate = selectProject[0]?.periodOfPerformance?.startDate
                ? new Date(selectProject[0].periodOfPerformance.startDate)
                : null;
            const firstEndDate = selectProject[0]?.periodOfPerformance?.endDate
                ? new Date(selectProject[0].periodOfPerformance.endDate)
                : null;

            // Function to compare dates
            const areDatesEqual = (date1: Date | null, date2: Date | null): boolean => {
                return date1 && date2 ? date1.getTime() === date2.getTime() : date1 === date2;
            };

            // Check if any projects have mismatched budgetHours, startDate, or endDate
            const mismatchedProjects = selectProject.filter((item: any) => {
                const startDate = item.periodOfPerformance?.startDate ? new Date(item.periodOfPerformance.startDate) : null;
                const endDate = item.periodOfPerformance?.endDate ? new Date(item.periodOfPerformance.endDate) : null;

                // Compare budgetHours, startDate, and endDate
                return (
                    item.budgetHours !== firstBudgetHours ||
                    !areDatesEqual(startDate, firstStartDate) ||
                    !areDatesEqual(endDate, firstEndDate)
                );
            });

            // If any projects have different budgetHours, startDate, or endDate, show an alert
            if (mismatchedProjects.length > 0) {
                alert('Error: Not all projects have matching budget hours, start date, and/or end date!');
                return;
            }
        }


        const url = isEditing ? `/api/groups/${isEditing}` : `/api/groups`;
        const method = isEditing ? 'PUT' : 'POST';
        const body = JSON.stringify({ name: groupName, projectIds: selectedProjects });

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
                },
                body,
            });
            if (!response.ok) throw new Error('Failed to save group');
            alert(isEditing ? 'Group updated successfully!' : 'Group created successfully!');
            setGroupName(''); // Reset the fields
            setSelectedProjects([]);
            setIsEditing(null); // Reset editing state
            const data = await response.json(); // Fetch the new groups after creation
            console.log(data)
        } catch (error) {
            console.error('Error saving group:', error);
            alert('Failed to save group.');
        }
    };

    // Handle editing a group
    const handleEditGroup = (group: Group) => {
        setIsEditing(group._id);
        setGroupName(group.name);
        setSelectedProjects(group.projectIds);
    };

    // Handle deleting a group
    const handleDeleteGroup = async (groupId: string) => {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
                }
            });
            if (!response.ok) throw new Error('Failed to delete group');
            alert('Group deleted successfully!');
            setGroups(groups.filter((group) => group._id !== groupId)); // Remove from UI
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Failed to delete group.');
        }
    };

    // Convert projects to the format react-select expects
    const projectOptions = projects.map((project) => ({
        value: project._id,
        label: project.name,
    }));

    const selectValue = useMemo(
        () =>
            projectOptions.filter((option) =>
                selectedProjects.some((item: any) => {
                    const v = typeof item === 'object' && item?.value != null ? item.value : item;
                    return v === option.value;
                }),
            ),
        [projectOptions, selectedProjects],
    );

    const projectNamesForGroup = (group: Group) =>
        group.projectIds
            .map((id: any) => {
                const raw = typeof id === 'object' && id?.value != null ? id.value : id;
                return projects.find((p) => p._id === raw)?.name;
            })
            .filter(Boolean)
            .sort() as string[];

    return (
        <div className="min-h-screen bg-surface">
            <Header
                pageTitle="Project groups"
                description="Combine projects that share budget hours and period of performance for grouped reporting."
            />
            <div className="app-shell">
                <div className="ui-card p-6">
                    <h2 className="mb-6 text-lg font-semibold text-fg">
                        {isEditing ? 'Edit group' : 'Create group'}
                    </h2>

                    <div className="mb-6">
                        <label htmlFor="group-name" className="mb-2 block text-sm font-medium text-fg-muted">
                            Group name
                        </label>
                        <input
                            id="group-name"
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name"
                            className="input-dark"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-fg-muted">Projects</label>
                        <Select
                            isMulti
                            value={selectValue}
                            options={projectOptions}
                            onChange={handleSelect}
                            placeholder="Select projects…"
                            closeMenuOnSelect={false}
                            theme={selectTheme}
                            styles={selectStyles}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSaveGroup}
                        disabled={!groupName || selectedProjects.length === 0}
                        className="btn-primary w-full sm:w-auto"
                    >
                        {isEditing ? 'Update group' : 'Create group'}
                    </button>
                </div>

                <h2 className="mb-4 mt-10 text-lg font-semibold text-fg">Existing groups</h2>
                <div className="table-shell overflow-x-auto">
                    <table className="table-data min-w-full border-collapse text-left text-sm">
                        <thead className="border-b border-line bg-surface-inset">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Projects</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-fg-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface-elevated">
                            {groups?.map((group) => (
                                <tr key={group._id}>
                                    <td className="border-b border-line px-4 py-3 font-mono text-xs text-fg-subtle">{group._id}</td>
                                    <td className="border-b border-line px-4 py-3 font-medium text-fg">{group.name}</td>
                                    <td className="border-b border-line px-4 py-3 text-fg-muted">
                                        {projectNamesForGroup(group).join(', ') || '—'}
                                    </td>
                                    <td className="border-b border-line px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEditGroup(group)}
                                                className="rounded-lg border border-line p-2 text-amber-400 transition-colors hover:border-amber-500/50 hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                                aria-label={`Edit ${group.name}`}
                                            >
                                                <FiEdit size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteGroup(group._id)}
                                                className="rounded-lg border border-line p-2 text-rose-400 transition-colors hover:border-rose-500/50 hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                                aria-label={`Delete ${group.name}`}
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}