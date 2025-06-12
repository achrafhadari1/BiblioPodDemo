import React from "react";
import { Plus, Trophy } from "lucide-react";

const CreateChallengeModal = ({
  showModal,
  onClose,
  newChallenge,
  setNewChallenge,
  onCreateChallenge,
  challengeCategories,
}) => {
  const handleCategoryToggle = (categoryId) => {
    if (newChallenge.categories.includes(categoryId)) {
      setNewChallenge({
        ...newChallenge,
        categories: newChallenge.categories.filter((id) => id !== categoryId),
      });
    } else {
      setNewChallenge({
        ...newChallenge,
        categories: [...newChallenge.categories, categoryId],
      });
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed min-h-screen inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-4 sm:p-6 overflow-y-auto max-h-[95vh] sm:max-h-[90vh] relative animate-fadeIn">
        <h2 className="font-playfair text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
          Create New Reading Challenge
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Challenge Title*
            </label>
            <input
              type="text"
              value={newChallenge.title}
              onChange={(e) =>
                setNewChallenge({ ...newChallenge, title: e.target.value })
              }
              placeholder="e.g., '10 Fantasy Books' or 'Summer Reading Goal'"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={newChallenge.description}
              onChange={(e) =>
                setNewChallenge({
                  ...newChallenge,
                  description: e.target.value,
                })
              }
              placeholder="What's this challenge about? Add details to keep yourself motivated."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book Goal*
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                max="100"
                value={newChallenge.goal_count}
                onChange={(e) =>
                  setNewChallenge({
                    ...newChallenge,
                    goal_count: parseInt(e.target.value) || 1,
                  })
                }
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="ml-2 text-gray-600">books</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={newChallenge.deadline}
              onChange={(e) =>
                setNewChallenge({ ...newChallenge, deadline: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Categories (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {challengeCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    newChallenge.categories.includes(category.id)
                      ? category.color
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="isPrivate"
              type="checkbox"
              checked={newChallenge.is_private}
              onChange={(e) =>
                setNewChallenge({
                  ...newChallenge,
                  is_private: e.target.checked,
                })
              }
              className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label
              htmlFor="isPrivate"
              className="ml-2 block text-sm text-gray-700"
            >
              Private Challenge (Only visible to you)
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 sm:mt-8 border-t pt-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={onCreateChallenge}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <Trophy size={16} />
            Create Challenge
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChallengeModal;
