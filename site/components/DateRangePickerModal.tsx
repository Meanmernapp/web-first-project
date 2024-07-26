import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useRouter } from 'next/router';

interface DateRangePickerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  initialRanges: Range[];
  onApply: (ranges: RangeKeyDict) => void;
  overallStartDate: Date;
  overallEndDate: Date;
}

const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({
  isOpen,
  onRequestClose,
  initialRanges,
  onApply,
  overallStartDate,
  overallEndDate,
}) => {
  const router = useRouter();
  const [ranges, setRanges] = useState<RangeKeyDict>(
    initialRanges.reduce((acc, range) => {
      if (range.key) {
        acc[range.key] = range;
      }
      return acc;
    }, {} as RangeKeyDict)
  );

  useEffect(() => {
    setRanges(
      initialRanges.reduce((acc, range) => {
        if (range.key) {
          acc[range.key] = range;
        }
        return acc;
      }, {} as RangeKeyDict)
    );
  }, [initialRanges]);

  const handleApply = () => {
    const { startDate, endDate } = ranges.selection;
    if (startDate && endDate) {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      router.push({
        pathname: router.pathname,
        query: { ...router.query, startDate: start, endDate: end },
      });
    }
    onApply(ranges);
  };

  const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const getStartOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
  const getEndOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31);
  const subtractMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() - months, date.getDate());
  const subtractYears = (date: Date, years: number) => new Date(date.getFullYear() - years, date.getMonth(), date.getDate());

  const staticRanges = [
    {
      label: 'This Month',
      range: {
        startDate: getStartOfMonth(new Date()),
        endDate: getEndOfMonth(new Date()),
        key: 'selection'
      },
    },
    {
      label: 'Last Month',
      range: {
        startDate: getStartOfMonth(subtractMonths(new Date(), 1)),
        endDate: getEndOfMonth(subtractMonths(new Date(), 1)),
        key: 'selection'
      },
    },
    {
      label: 'This Year',
      range: {
        startDate: getStartOfYear(new Date()),
        endDate: getEndOfYear(new Date()),
        key: 'selection'
      },
    },
    {
      label: 'Last Year',
      range: {
        startDate: getStartOfYear(subtractYears(new Date(), 1)),
        endDate: getEndOfYear(subtractYears(new Date(), 1)),
        key: 'selection'
      },
    },
    {
      label: 'Overall',
      range: {
        startDate: overallStartDate,
        endDate: overallEndDate,
        key: 'selection'
      },
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Select Date Range"
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
    >
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">Select Date Range</h2>
        <DateRange
          editableDateInputs={true}
          onChange={(rangesByKey: RangeKeyDict) => setRanges(rangesByKey)}
          moveRangeOnFirstSelection={false}
          ranges={Object.values(ranges)}
          className="mb-4"
        />
        <div className="flex flex-col mb-4 space-y-2">
          {staticRanges.map((range, index) => (
            <button
              key={index}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setRanges({ selection: range.range })}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-gray-500 text-white rounded mr-2" onClick={onRequestClose}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DateRangePickerModal;
