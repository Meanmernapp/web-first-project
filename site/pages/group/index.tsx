import { useState, useEffect } from 'react';
import Select from 'react-select';
import { FiEdit, FiTrash2 } from 'react-icons/fi'; // Edit and Delete Icons from react-icons
import Header from '@/components/Header';

interface Project {
    budgetHours?: any;
    _id: string;
    name: string;
    status?: string;
    contractType?: string;
    periodOfPerformance?: {
        startDate: string;
        endDate: string;
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
            const firstStartDate = selectProject[0].periodOfPerformance?.startDate;
            const firstEndDate = selectProject[0].periodOfPerformance?.endDate;

            // Check if any projects have mismatched budgetHours, startDate, or endDate
            const mismatchedProjects = selectProject.filter((item: any) => {
                const startDate = item.periodOfPerformance?.startDate;
                const endDate = item.periodOfPerformance?.endDate;

                // Compare budgetHours, startDate, and endDate
                return (
                    item.budgetHours !== firstBudgetHours ||
                    startDate !== firstStartDate ||
                    endDate !== firstEndDate
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

    return (
        <div className="p-4 bg-gray-200 dark:bg-gray-900 min-h-screen">
            <Header pageTitle="Project Timesheets" />
            <h1 className="text-2xl font-bold mb-4 text-center">{isEditing ? 'Edit Group' : 'Create Group'}</h1>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Group Name:</label>
                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Projects:</label>
                <Select
                    isMulti
                    value={projectOptions.filter((option) => selectedProjects.some((item: any) => item.value === option.value))}
                    options={projectOptions}
                    onChange={handleSelect}
                    placeholder="Select projects..."
                    closeMenuOnSelect={false}
                    className="text-black"
                    styles={{
                        control: (base) => ({
                            ...base,
                            backgroundColor: '#374151',
                            color: 'white',
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: '#4B5563',
                        }),
                        multiValue: (base) => ({
                            ...base,
                            backgroundColor: '#1F2937',
                            color: 'white',
                        }),
                        multiValueLabel: (base) => ({
                            ...base,
                            color: 'white',
                        }),
                    }}
                />
            </div>

            <button
                onClick={handleSaveGroup}
                disabled={!groupName || selectedProjects.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded disabled:opacity-50"
            >
                {isEditing ? 'Update Group' : 'Create Group'}
            </button>

            <h2 className="text-xl font-semibold mt-8 mb-4">Existing Groups</h2>
            <table className="w-full table-auto text-white">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Group Name</th>
                        <th className="p-3">Projects</th>
                        <th className="p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {groups?.map((group) => (
                        <tr key={group._id} className="bg-gray-800 border-t border-gray-600">
                            <td className="p-3">{group._id}</td>
                            <td className="p-3">{group.name}</td>
                            <td className="p-3">{group.projectIds.map((id: any) => projects.find((p) => p._id === id.value)?.name).join(', ')}</td>
                            <td className="p-3 flex space-x-3">
                                <button
                                    onClick={() => handleEditGroup(group)}
                                    className="text-yellow-500 hover:text-yellow-400"
                                >
                                    <FiEdit size={20} />
                                </button>
                                <button
                                    onClick={() => handleDeleteGroup(group._id)}
                                    className="text-red-500 hover:text-red-400"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
